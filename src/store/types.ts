import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';
import type { MindNodeData } from '../features/nodes/types';
import type { MindEdgeData } from '../features/edges/types';

export type AppNode = Node<MindNodeData>;
export type AppEdge = Edge<MindEdgeData>;

export type LayoutType = 'tree-LR' | 'tree-TB' | 'radial';
export type HandleVisibility = 'hidden' | 'dashed' | 'always';

export interface ProjectSettings {
  handleVisibility: HandleVisibility;
}

export interface LoadDocumentPayload {
  documentName: string;
  layoutType: LayoutType;
  nodes: AppNode[];
  edges: AppEdge[];
  projectSettings?: ProjectSettings;
}

/**
 * Категория действия, породившего запись истории. Используется, чтобы решить,
 * нужно ли ре-центрировать вид (fitView) при undo/redo:
 * - structural — добавление/удаление узла, связь (меняется геометрия) → fitView
 * - layout     — auto-layout / смена layoutType (двигаются все узлы)    → fitView
 * - move       — перемещение узла мышью (узел и так в видимой области)  → без fitView
 * - text       — правка label / данных без изменения структуры          → без fitView
 */
export type HistoryCategory = 'structural' | 'layout' | 'move' | 'text';

/**
 * Полный immutable-снимок дерева для undo/redo.
 * Содержит только источник истины (узлы, связи) и значимую мета
 * (layoutType) плюс категорию перехода. Эфемерное состояние (выделение,
 * hover, редактор, тема) сюда НЕ входит — иначе откат «прыгал» бы по UI.
 * projectSettings намеренно НЕ входит: это preference документа, а не граф.
 */
export interface HistorySnapshot {
  nodes: AppNode[];
  edges: AppEdge[];
  layoutType: LayoutType;
  category: HistoryCategory;
}

export interface MindMapState {
  nodes: AppNode[];
  edges: AppEdge[];

  documentName: string;
  filePath: string | null;
  isDirty: boolean;
  layoutType: LayoutType;
  projectSettings: ProjectSettings;

  /** Стек прошлого/будущего для undo/redo. */
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  canUndo: boolean;
  canRedo: boolean;

  addChildNode: (
    parentId: string,
    position?: { x: number; y: number },
    handles?: { sourceHandle?: string; targetHandle?: string },
  ) => string | null;
  addSiblingNode: (siblingId: string) => string | null;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeData: (id: string, data: Partial<MindNodeData>) => void;
  deleteNode: (id: string) => void;

  getRootNode: () => AppNode | undefined;
  getParentId: (nodeId: string) => string | null;
  getDescendantIds: (nodeId: string) => string[];

  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  setLayoutType: (type: LayoutType) => void;
  applyAutoLayout: () => void;
  applyAutoLayoutManual: () => void;
  applyAutoLayoutIfEnabled: () => void;

  loadDocument: (payload: LoadDocumentPayload) => void;
  resetDocument: () => void;
  createNewDocument: () => void;
  setFilePath: (path: string | null) => void;
  setDocumentName: (name: string) => void;
  markSaved: () => void;
  markDirty: () => void;
  setProjectSettings: (patch: Partial<ProjectSettings>) => void;

  /** Снять снимок текущего дерева в past (для drag — на старте перетаскивания). */
  pushHistory: (category?: HistoryCategory) => void;
  undo: () => void;
  redo: () => void;
}
