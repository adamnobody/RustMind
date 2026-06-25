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
import { MIND_NODE_TYPE } from '../features/nodes/types';
import { generateNodeId, generateEdgeId } from '../shared/lib/id';
import { DEFAULT_LABELS, NODE_COLORS } from '../shared/lib/constants';
import { applyLayout } from '../features/layout/applyLayout';
import { useUIStore } from './uiStore';

/** Максимум записей в истории — защита от роста памяти при долгой сессии. */
const HISTORY_LIMIT = 100;

/**
 * Окно коалесинга для ввода текста: несколько вызовов updateNodeLabel по
 * одному узлу подряд (быстрая печать) сворачиваются в одну запись истории.
 * Сбрасывается по таймауту, по смене активного узла или любым другим
 * undoable-действием.
 */
const LABEL_COALESCE_MS = 600;
let labelCoalesceId: string | null = null;
let labelCoalesceAt = 0;

function resetLabelCoalesce(): void {
  labelCoalesceId = null;
  labelCoalesceAt = 0;
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

function createEdge(source: string, target: string): AppEdge {
  return {
    id: generateEdgeId(source, target),
    source,
    target,
    type: 'mindEdge',
  };
}

const initialRoot = createRootNode();

export const useMindMapStore = create<MindMapState>()(
  immer((set, get) => {
    /**
     * \u041f\u043e\u043b\u043d\u044b\u0435 immutable-\u0441\u043d\u0438\u043c\u043a\u0438 \u043f\u0440\u0438\u0435\u043c\u043b\u0435\u043c\u044b \u0434\u043b\u044f \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u043c\u0430\u0441\u0448\u0442\u0430\u0431\u0430 (\u0434\u0435\u0441\u044f\u0442\u043a\u0438\u2014\u0441\u043e\u0442\u043d\u0438
     * \u0443\u0437\u043b\u043e\u0432): \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u043d\u043e\u0435 \u0448\u0430\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 immer + \u0440\u0435\u0434\u043a\u043e\u0441\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u0434\u0435\u043b\u0430\u044e\u0442
     * \u0433\u043b\u0443\u0431\u043e\u043a\u043e\u0435 \u043a\u043b\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0434\u0435\u0448\u0451\u0432\u044b\u043c, \u0430 \u043a\u043e\u0434 \u2014 \u043f\u0440\u043e\u0441\u0442\u044b\u043c \u0438 \u043f\u0440\u0435\u0434\u0441\u043a\u0430\u0437\u0443\u0435\u043c\u044b\u043c.
     * \u0421\u043d\u0438\u043c\u0430\u0435\u043c \u0422\u0415\u041a\u0423\u0429\u0415\u0415 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0432 past, \u0447\u0438\u0441\u0442\u0438\u043c future \u0438 \u0440\u0435\u0436\u0435\u043c \u043f\u043e \u043b\u0438\u043c\u0438\u0442\u0443.
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
      resetLabelCoalesce();
    };

    return {
    nodes: [initialRoot],
    edges: [],
    documentName: '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f',
    filePath: null,
    isDirty: false,
    layoutType: 'tree-LR',

    past: [],
    future: [],
    canUndo: false,
    canRedo: false,

    getRootNode: () => get().nodes.find((n) => n.data.isRoot),

    getParentId: (nodeId) => {
      const edge = get().edges.find((e) => e.target === nodeId);
      return edge ? edge.source : null;
    },

    getDescendantIds: (nodeId) => {
      const { edges } = get();
      const result: string[] = [];
      const stack = [nodeId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        const children = edges.filter((e) => e.source === current).map((e) => e.target);
        for (const child of children) {
          result.push(child);
          stack.push(child);
        }
      }
      return result;
    },

    addChildNode: (parentId, position) => {
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

      set((state) => {
        state.nodes.push(newNode);
        state.edges.push(createEdge(parentId, newId));
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
      const now = Date.now();
      const coalescing = labelCoalesceId === id && now - labelCoalesceAt < LABEL_COALESCE_MS;
      if (!coalescing) {
        recordHistory('text'); // сбрасывает labelCoalesce* внутри себя
      }
      labelCoalesceId = id;
      labelCoalesceAt = now;

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
      recordHistory('structural');
      set((state) => {
        state.edges = addEdge({ ...connection, type: 'mindEdge' }, state.edges);
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
      // \u041e\u0442\u043a\u0440\u044b\u0442\u0438\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0441\u0431\u0440\u0430\u0441\u044b\u0432\u0430\u0435\u0442 \u0438\u0441\u0442\u043e\u0440\u0438\u044e: \u0441\u043d\u0438\u043c\u043a\u0438 \u0438\u0437 \u043f\u0440\u043e\u0448\u043b\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430
      // \u043e\u0442\u043d\u043e\u0441\u044f\u0442\u0441\u044f \u043a \u0434\u0440\u0443\u0433\u043e\u043c\u0443 \u0434\u0435\u0440\u0435\u0432\u0443, \u0438\u0445 \u043e\u0442\u043a\u0430\u0442 \u0431\u044b\u043b \u0431\u044b \u0431\u0435\u0441\u0441\u043c\u044b\u0441\u043b\u0435\u043d\u043d\u044b\u043c/\u043e\u043f\u0430\u0441\u043d\u044b\u043c.
      resetLabelCoalesce();
      set((state) => {
        state.nodes = payload.nodes;
        state.edges = payload.edges;
        state.documentName = payload.documentName;
        state.layoutType = payload.layoutType;
        state.isDirty = false;
        state.past = [];
        state.future = [];
        state.canUndo = false;
        state.canRedo = false;
      });
    },

    resetDocument: () => {
      const root = createRootNode();
      resetLabelCoalesce();
      set((state) => {
        state.nodes = [root];
        state.edges = [];
        state.documentName = '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f';
        state.filePath = null;
        state.isDirty = false;
        state.layoutType = 'tree-LR';
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

    pushHistory: (category = 'move') => {
      recordHistory(category);
    },

    undo: () => {
      const { past, nodes, edges, layoutType } = get();
      if (past.length === 0) return;
      resetLabelCoalesce();

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
      resetLabelCoalesce();

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
