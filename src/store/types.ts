import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';
import type { MindNodeData } from '../features/nodes/types';

export type AppNode = Node<MindNodeData>;
export type AppEdge = Edge;

export type LayoutType = 'tree-LR' | 'tree-TB' | 'radial';

/** Структура для загрузки документа в стор */
export interface LoadDocumentPayload {
  documentName: string;
  layoutType: LayoutType;
  nodes: AppNode[];
  edges: AppEdge[];
}

export interface MindMapState {
  // --- Данные графа ---
  nodes: AppNode[];
  edges: AppEdge[];

  // --- Метаданные документа ---
  documentName: string;
  filePath: string | null;
  isDirty: boolean;
  layoutType: LayoutType;

  // --- Действия с узлами ---
  /** Создаёт дочерний узел, возвращает его id */
  addChildNode: (parentId: string) => string | null;
  /** Создаёт соседний узел (того же родителя), возвращает id */
  addSiblingNode: (siblingId: string) => string | null;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeData: (id: string, data: Partial<MindNodeData>) => void;
  /** Удаляет узел и всех потомков. Корень удалить нельзя. */
  deleteNode: (id: string) => void;

  // --- Хелперы графа ---
  getRootNode: () => AppNode | undefined;
  getParentId: (nodeId: string) => string | null;
  getDescendantIds: (nodeId: string) => string[];

  // --- React Flow реакции ---
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  // --- Layout ---
  setLayoutType: (type: LayoutType) => void;
  applyAutoLayout: () => void;

  // --- Документ ---
  loadDocument: (payload: LoadDocumentPayload) => void;
  resetDocument: () => void;
  createNewDocument: () => void;
  setFilePath: (path: string | null) => void;
  setDocumentName: (name: string) => void;
  markSaved: () => void;
}
