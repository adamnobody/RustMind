import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type {
  MindMapState,
  AppNode,
  AppEdge,
  HistorySnapshot,
  HistoryCategory,
} from './types';
import { MIND_NODE_TYPE, DEFAULT_NODE_STYLE } from '../features/nodes/types';
import { type EdgeKind, isTreeEdge, DEFAULT_TREE_EDGE_HANDLES } from '../features/edges/types';
import { generateNodeId, generateEdgeId } from '../shared/lib/id';
import { pruneStyle } from '../shared/lib/style';
import { DEFAULT_LABELS, NODE_COLORS, DEFAULT_HANDLE_VISIBILITY } from '../shared/lib/constants';
import { applyLayout } from '../features/layout/applyLayout';
import { useUIStore } from './uiStore';

/** Максимум записей в истории — защита от роста памяти при долгой сессии. */
const HISTORY_LIMIT = 100;

/**
 * Окно коалесинга для непрерывных правок: серия однотипных undoable-действий по
 * одной цели подряд (быстрая печать в label, протяжка слайдера/цвета в стиле)
 * сворачивается в одну запись истории. Ключ различает цель+вид правки
 * (`label:<id>`, `style:<id>`), поэтому смена узла или переключение с текста на
 * стиль открывают новую запись. Сбрасывается по таймауту, undo/redo, загрузке.
 */
const COALESCE_MS = 600;
let coalesceKey: string | null = null;
let coalesceAt = 0;

function resetCoalesce(): void {
  coalesceKey = null;
  coalesceAt = 0;
}

/** Ре-центрируем вид только на структурных и layout-переходах. */
function shouldRecenter(category: HistoryCategory): boolean {
  return category === 'structural' || category === 'layout';
}

function createRootNode(): AppNode {
  return {
    id: generateNodeId(),
    type: MIND_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: {
      label: DEFAULT_LABELS.root,
      isRoot: true,
      color: NODE_COLORS.root,
    },
  };
}

function createEdge(
  source: string,
  target: string,
  kind: EdgeKind,
  sourceHandle?: string,
  targetHandle?: string,
): AppEdge {
  return {
    id: generateEdgeId(source, target),
    source,
    target,
    type: 'mindEdge',
    sourceHandle,
    targetHandle,
    data: { kind },
  };
}

const initialRoot = createRootNode();

export const useMindMapStore = create<MindMapState>()(
  immer((set, get) => {
    /**
     * Полные immutable-снимки приемлемы для текущего масштаба (десятки—сотни
     * узлов): структурное шарирование immer + редкость действий делают
     * глубокое клонирование дешёвым, а код — простым и предсказуемым.
     * Снимаем ТЕКУЩЕЕ состояние в past, чистим future и режем по лимиту.
     */
    const recordHistory = (category: HistoryCategory): void => {
      const { nodes, edges, layoutType } = get();
      const snapshot: HistorySnapshot = {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
        layoutType,
        category,
      };
      set((state) => {
        state.past.push(snapshot);
        if (state.past.length > HISTORY_LIMIT) {
          state.past.shift();
        }
        state.future = [];
        state.canUndo = state.past.length > 0;
        state.canRedo = false;
      });
      resetCoalesce();
    };

    /**
     * Запись истории с коалесингом по ключу: первый вызов в серии пишет снимок,
     * последующие вызовы с тем же ключом в пределах окна — нет (одна запись undo
     * на всю серию). Любой другой ключ/категория или таймаут открывают новую.
     */
    const recordCoalesced = (key: string, category: HistoryCategory): void => {
      const now = Date.now();
      const coalescing = coalesceKey === key && now - coalesceAt < COALESCE_MS;
      if (!coalescing) {
        recordHistory(category); // сбрасывает coalesce* внутри себя
      }
      coalesceKey = key;
      coalesceAt = now;
    };

    return {
    nodes: [initialRoot],
    edges: [],
    documentName: 'Без названия',
    filePath: null,
    isDirty: false,
    layoutType: 'tree-LR',
    projectSettings: { handleVisibility: DEFAULT_HANDLE_VISIBILITY },

    past: [],
    future: [],
    canUndo: false,
    canRedo: false,

    getRootNode: () => get().nodes.find((n) => n.data.isRoot),

    getParentId: (nodeId) => {
      // Родителя задаёт только структурное ребро; free-связь, входящая в узел,
      // не делает его источник родителем.
      const edge = get().edges.find((e) => e.target === nodeId && isTreeEdge(e));
      return edge ? edge.source : null;
    },

    getDescendantIds: (nodeId) => {
      const { edges } = get();
      const result: string[] = [];
      const stack = [nodeId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        // Каскад идёт только по дереву — free-связи не тянут чужие поддеревья.
        const children = edges
          .filter((e) => e.source === current && isTreeEdge(e))
          .map((e) => e.target);
        for (const child of children) {
          result.push(child);
          stack.push(child);
        }
      }
      return result;
    },

    addChildNode: (parentId, position, handles) => {
      const parent = get().nodes.find((n) => n.id === parentId);
      if (!parent) return null;

      recordHistory('structural');

      const newId = generateNodeId();
      const newNode: AppNode = {
        id: newId,
        type: MIND_NODE_TYPE,
        // При drag от хэндла узел появляется в точке отпускания (position),
        // иначе — со смещением вправо от родителя.
        position: position ?? { x: parent.position.x + 200, y: parent.position.y },
        data: { label: DEFAULT_LABELS.child },
      };

      // Хэндлы ребра: при drag берём фактический хэндл из жеста (handles),
      // иначе (Tab/Enter — жеста нет) — фиксированный дефолт. Никакой подмены
      // направлением layout: на каком хэндле начат drag, такой и остаётся.
      const sourceHandle = handles?.sourceHandle ?? DEFAULT_TREE_EDGE_HANDLES.sourceHandle;
      const targetHandle = handles?.targetHandle ?? DEFAULT_TREE_EDGE_HANDLES.targetHandle;

      set((state) => {
        state.nodes.push(newNode);
        state.edges.push(createEdge(parentId, newId, 'tree', sourceHandle, targetHandle));
        state.isDirty = true;
      });

      // Если auto-layout включён — узел сразу пересчитается на своё место.
      get().applyAutoLayoutIfEnabled();
      return newId;
    },

    addSiblingNode: (siblingId) => {
      const parentId = get().getParentId(siblingId);
      if (!parentId) return null;
      return get().addChildNode(parentId);
    },

    updateNodeLabel: (id, label) => {
      // Коалесинг: подряд идущие правки одного узла в пределах окна — одна
      // запись истории. Смена узла или таймаут открывают новую запись.
      recordCoalesced(`label:${id}`, 'text');

      set((state) => {
        const node = state.nodes.find((n) => n.id === id);
        if (node) {
          node.data.label = label;
          state.isDirty = true;
        }
      });
    },

    updateNodeData: (id, data) => {
      recordHistory('text');
      set((state) => {
        const node = state.nodes.find((n) => n.id === id);
        if (node) {
          node.data = { ...node.data, ...data };
          state.isDirty = true;
        }
      });
    },

    setNodeStyle: (id, patch) => {
      // Серия правок стиля одного узла (протяжка слайдера/цвета) — одна запись
      // undo. Стиль не меняет геометрию → категория 'text', без ре-центровки.
      recordCoalesced(`style:${id}`, 'text');
      set((state) => {
        const node = state.nodes.find((n) => n.id === id);
        if (!node) return;
        // Единый источник дефолтов: после merge выкидываем поля, равные дефолту,
        // тем же pruneStyle, что и сериализатор. Возврат поля к дефолту = его
        // удаление из style, а не запись явного значения.
        const merged = { ...node.data.style, ...patch };
        node.data.style = pruneStyle(merged, DEFAULT_NODE_STYLE);
        state.isDirty = true;
      });
    },

    deleteNode: (id) => {
      const node = get().nodes.find((n) => n.id === id);
      if (!node || node.data.isRoot) return;

      recordHistory('structural');

      const toDelete = new Set([id, ...get().getDescendantIds(id)]);
      set((state) => {
        state.nodes = state.nodes.filter((n) => !toDelete.has(n.id));
        state.edges = state.edges.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target));
        state.isDirty = true;
      });
      get().applyAutoLayoutIfEnabled();
    },

    onNodesChange: (changes) => {
      set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes);
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges);
      });
    },

    onConnect: (connection) => {
      // Рисование связи мышью = ассоциативное (free) ребро: хэндлы берутся из
      // жеста (connection.sourceHandle/targetHandle) и фиксируются — layout их
      // не переписывает. Источник такого ребра НЕ становится родителем цели.
      recordHistory('structural');
      set((state) => {
        state.edges = addEdge(
          { ...connection, type: 'mindEdge', data: { kind: 'free' } },
          state.edges,
        );
        state.isDirty = true;
      });
    },

    setLayoutType: (type) => {
      recordHistory('layout');
      set((state) => {
        state.layoutType = type;
        state.isDirty = true;
      });
      get().applyAutoLayout();
    },

    // Чистый пересчёт раскладки без записи в историю — используется как
    // внутренний шаг других действий (add/delete/open), чтобы они оставались
    // одной записью undo, а не двумя.
    applyAutoLayout: () => {
      const { nodes, edges, layoutType } = get();
      const result = applyLayout(nodes, edges, layoutType);
      set((state) => {
        state.nodes = result.nodes;
        state.edges = result.edges;
      });
    },

    // Ручной auto-layout (кнопка/хоткей) — отдельное undoable-действие.
    applyAutoLayoutManual: () => {
      recordHistory('layout');
      get().applyAutoLayout();
      set((state) => {
        state.isDirty = true;
      });
    },

    applyAutoLayoutIfEnabled: () => {
      const { autoLayoutOnChange } = useUIStore.getState().settings;
      if (autoLayoutOnChange) {
        get().applyAutoLayout();
      }
    },

    loadDocument: (payload) => {
      // Открытие документа сбрасывает историю: снимки из прошлого документа
      // относятся к другому дереву, их откат был бы бессмысленным/опасным.
      resetCoalesce();
      set((state) => {
        state.nodes = payload.nodes;
        state.edges = payload.edges;
        state.documentName = payload.documentName;
        state.layoutType = payload.layoutType;
        state.projectSettings = payload.projectSettings ?? { handleVisibility: DEFAULT_HANDLE_VISIBILITY };
        state.isDirty = false;
        state.past = [];
        state.future = [];
        state.canUndo = false;
        state.canRedo = false;
      });
    },

    resetDocument: () => {
      const root = createRootNode();
      resetCoalesce();
      set((state) => {
        state.nodes = [root];
        state.edges = [];
        state.documentName = 'Без названия';
        state.filePath = null;
        state.isDirty = false;
        state.layoutType = 'tree-LR';
        state.projectSettings = { handleVisibility: DEFAULT_HANDLE_VISIBILITY };
        state.past = [];
        state.future = [];
        state.canUndo = false;
        state.canRedo = false;
      });
    },

    createNewDocument: () => get().resetDocument(),

    setFilePath: (path) =>
      set((state) => {
        state.filePath = path;
      }),
    setDocumentName: (name) =>
      set((state) => {
        state.documentName = name;
        state.isDirty = true;
      }),
    markSaved: () =>
      set((state) => {
        state.isDirty = false;
      }),
    markDirty: () =>
      set((state) => {
        state.isDirty = true;
      }),

    setProjectSettings: (patch) => {
      set((state) => {
        state.projectSettings = { ...state.projectSettings, ...patch };
        state.isDirty = true;
      });
    },

    pushHistory: (category = 'move') => {
      recordHistory(category);
    },

    undo: () => {
      const { past, nodes, edges, layoutType } = get();
      if (past.length === 0) return;
      resetCoalesce();

      const previous = past[past.length - 1];
      // Текущее состояние уезжает в future с той же категорией перехода,
      // чтобы redo восстановил его и принял такое же решение про fitView.
      const current: HistorySnapshot = {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
        layoutType,
        category: previous.category,
      };

      set((state) => {
        state.past.pop();
        state.future.push(current);
        state.nodes = structuredClone(previous.nodes);
        state.edges = structuredClone(previous.edges);
        state.layoutType = previous.layoutType;
        state.isDirty = true;
        state.canUndo = state.past.length > 0;
        state.canRedo = true;
      });

      // Эфемерное состояние не входит в снимок — чистим явно, чтобы курсор
      // редактора/выделение не указывали на исчезнувший узел.
      const ui = useUIStore.getState();
      ui.clearNodeEditing();
      ui.setSelectedNodeId(null);
      // Ре-центрируем только структурные/layout-откаты; текстовые и move —
      // оставляют вид на месте, чтобы он не «дёргался».
      if (shouldRecenter(previous.category)) {
        setTimeout(() => useUIStore.getState().triggerFitView(), 50);
      }
    },

    redo: () => {
      const { future, nodes, edges, layoutType } = get();
      if (future.length === 0) return;
      resetCoalesce();

      const next = future[future.length - 1];
      const current: HistorySnapshot = {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
        layoutType,
        category: next.category,
      };

      set((state) => {
        state.future.pop();
        state.past.push(current);
        state.nodes = structuredClone(next.nodes);
        state.edges = structuredClone(next.edges);
        state.layoutType = next.layoutType;
        state.isDirty = true;
        state.canUndo = true;
        state.canRedo = state.future.length > 0;
      });

      const ui = useUIStore.getState();
      ui.clearNodeEditing();
      ui.setSelectedNodeId(null);
      if (shouldRecenter(next.category)) {
        setTimeout(() => useUIStore.getState().triggerFitView(), 50);
      }
    },
    };
  }),
);
