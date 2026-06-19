import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { MindMapState, AppNode, AppEdge } from './types';
import { MIND_NODE_TYPE } from '../features/nodes/types';
import { generateNodeId, generateEdgeId } from '../shared/lib/id';
import { DEFAULT_LABELS, NODE_COLORS } from '../shared/lib/constants';
import { applyLayout } from '../features/layout/applyLayout';

/** Создаёт корневой узел нового документа */
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

/** Создаёт связь родитель → ребёнок */
function createEdge(source: string, target: string): AppEdge {
  return {
    id: generateEdgeId(source, target),
    source,
    target,
    type: 'mindEdge', // кастомный edge подключим позже
  };
}

const initialRoot = createRootNode();

export const useMindMapStore = create<MindMapState>()(
  immer((set, get) => ({
    // --- Начальное состояние ---
    nodes: [initialRoot],
    edges: [],
    documentName: 'Без названия',
    filePath: null,
    isDirty: false,
    layoutType: 'tree-LR',

    // --- Хелперы графа ---
    getRootNode: () => get().nodes.find((n) => n.data.isRoot),

    getParentId: (nodeId) => {
      const edge = get().edges.find((e) => e.target === nodeId);
      return edge ? edge.source : null;
    },

    getDescendantIds: (nodeId) => {
      // BFS/DFS обход по edges для сбора всех потомков
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

    // --- Действия с узлами ---
    addChildNode: (parentId) => {
      const parent = get().nodes.find((n) => n.id === parentId);
      if (!parent) return null;

      const newId = generateNodeId();
      const newNode: AppNode = {
        id: newId,
        type: MIND_NODE_TYPE,
        // позиция временная — её пересчитает layout
        position: { x: parent.position.x + 200, y: parent.position.y },
        data: { label: DEFAULT_LABELS.child },
      };

      set((state) => {
        state.nodes.push(newNode);
        state.edges.push(createEdge(parentId, newId));
        state.isDirty = true;
      });

      get().applyAutoLayout();
      return newId;
    },

    addSiblingNode: (siblingId) => {
      const parentId = get().getParentId(siblingId);
      // У корня нет родителя → sibling добавить нельзя, возвращаем null, поведение для корня — только addChild.
      if (!parentId) return null;
      return get().addChildNode(parentId);
    },

    updateNodeLabel: (id, label) => {
      set((state) => {
        const node = state.nodes.find((n) => n.id === id);
        if (node) {
          node.data.label = label;
          state.isDirty = true;
        }
      });
    },

    updateNodeData: (id, data) => {
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
      if (!node || node.data.isRoot) return; // корень не удаляем

      const toDelete = new Set([id, ...get().getDescendantIds(id)]);
      set((state) => {
        state.nodes = state.nodes.filter((n) => !toDelete.has(n.id));
        state.edges = state.edges.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target));
        state.isDirty = true;
      });
      get().applyAutoLayout();
    },

    // --- React Flow реакции ---
    onNodesChange: (changes) => {
      set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes);
      });
    },

    // В @xyflow/react onEdgesChange принимает EdgeChange<AppEdge>[] или просто EdgeChange[]
    onEdgesChange: (changes) => {
      set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges);
      });
    },

    onConnect: (connection) => {
      set((state) => {
        state.edges = addEdge({ ...connection, type: 'mindEdge' }, state.edges);
        state.isDirty = true;
      });
    },

    // --- Layout ---
    setLayoutType: (type) => {
      set((state) => {
        state.layoutType = type;
      });
      get().applyAutoLayout();
    },

    applyAutoLayout: () => {
      const { nodes, edges, layoutType } = get();
      const result = applyLayout(nodes, edges, layoutType);
      set((state) => {
        state.nodes = result.nodes;
        state.edges = result.edges;
      });
    },

    // --- Документ ---
    loadDocument: (payload) => {
      set((state) => {
        state.nodes = payload.nodes;
        state.edges = payload.edges;
        state.documentName = payload.documentName;
        state.layoutType = payload.layoutType;
        state.isDirty = false;
      });
    },

    resetDocument: () => {
      const root = createRootNode();
      set((state) => {
        state.nodes = [root];
        state.edges = [];
        state.documentName = 'Без названия';
        state.filePath = null;
        state.isDirty = false;
        state.layoutType = 'tree-LR';
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
  })),
);
