import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';
import type { HandleSide, MindNodeData, NodeStyle } from '../features/nodes/types';
import type { EdgeStyle, MindEdgeData } from '../features/edges/types';
import type { LayoutKind } from '../features/layout/engines/layoutTypes';
import type { Group, GroupTitleStyle } from '../features/groups/types';

export type AppNode = Node<MindNodeData>;
export type AppEdge = Edge<MindEdgeData>;

/** Тип раскладки документа — см. features/layout (12 видов, дефолт 'hierarchy'). */
export type LayoutType = LayoutKind;
export type HandleVisibility = 'hidden' | 'dashed' | 'always';

export interface ProjectSettings {
  handleVisibility: HandleVisibility;
  /** Глобальный фон холста (hex). Отсутствие — фон темы. */
  backgroundColor?: string;
  /** Фоновое изображение холста (data URL). */
  backgroundImage?: string;
  /** Цвет ВСЕХ связей (переопределяет --rm-edge); per-edge стиль имеет приоритет. */
  edgeColor?: string;
  /**
   * Цвет фона узлов по уровням дерева: индекс 0 — уровень 1 (дети корня), 1 —
   * уровень 2 и т.д. Пустая строка/отсутствие — без переопределения. Применяется
   * только к узлам без собственного цвета фона.
   */
  levelColors?: string[];
}

export interface LoadDocumentPayload {
  documentName: string;
  layoutType: LayoutType;
  nodes: AppNode[];
  edges: AppEdge[];
  projectSettings?: ProjectSettings;
  groups?: Group[];
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
  groups: Group[];
  layoutType: LayoutType;
  category: HistoryCategory;
}

export interface MindMapState {
  nodes: AppNode[];
  edges: AppEdge[];
  groups: Group[];

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
  /**
   * Реприкрепление в структуре (drag = XMind-модель): переносит nodeId под
   * newParentId, вставляя его в позицию index среди новых сиблингов (конец,
   * если не задан). Отклоняется, если newParentId — потомок nodeId (или сам
   * nodeId — цикл), если nodeId — корень, или если canConnect текущей
   * раскладки запрещает связь. Возвращает true при успехе.
   * `skipHistory` — канвас уже снял снимок на старте drag (pushHistory); без
   * этого флага здесь появилась бы вторая запись undo на один жест.
   */
  moveNode: (
    nodeId: string,
    newParentId: string,
    index?: number,
    options?: { skipHistory?: boolean },
  ) => boolean;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeData: (id: string, data: Partial<MindNodeData>) => void;
  /**
   * Свернуть/развернуть ветки узла: прячет/показывает перечисленных прямых
   * потомков вместе с их поддеревьями. Если все `childIds` уже свёрнуты —
   * разворачивает их, иначе сворачивает. Структурное действие.
   */
  toggleBranchCollapse: (parentId: string, childIds: string[]) => void;
  /** Отметить/снять узел-задачу как выполненный. */
  toggleNodeChecked: (id: string) => void;
  /** Заметка узла (коалесится как label; пустая строка удаляет поле). */
  setNodeNote: (id: string, note: string) => void;
  /**
   * Merge a partial style override into a node, then prune against
   * DEFAULT_NODE_STYLE so any field set to its default is removed (not stored as
   * an explicit default). Single source of defaults shared with the serializer.
   */
  setNodeStyle: (id: string, patch: Partial<NodeStyle>) => void;
  /**
   * Move a connection handle along its side (percent 0–100, 50 = centre).
   * Values are clamped and rounded; 50 removes the key (default not stored).
   */
  setNodeHandleOffset: (id: string, side: HandleSide, value: number) => void;
  deleteNode: (id: string) => void;

  /**
   * Merge a partial style override into an edge, pruned against
   * DEFAULT_EDGE_STYLE — same contract as setNodeStyle. `label` lives in the
   * style; pass `label: undefined` to remove it.
   */
  setEdgeStyle: (id: string, patch: Partial<EdgeStyle>) => void;
  /**
   * Delete free (associative) edges by id. Tree edges are skipped: they define
   * the hierarchy and are only removed together with their child node.
   */
  deleteEdges: (ids: string[]) => void;

  getRootNode: () => AppNode | undefined;
  getParentId: (nodeId: string) => string | null;
  getDescendantIds: (nodeId: string) => string[];

  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  setLayoutType: (type: LayoutType) => void;
  applyAutoLayout: () => void;
  applyAutoLayoutManual: () => void;
  /** Пересчёт позиций после структурного изменения — только для 'derived' раскладок (не network). */
  recomputeIfDerived: () => void;

  loadDocument: (payload: LoadDocumentPayload) => void;
  resetDocument: () => void;
  createNewDocument: () => void;
  setFilePath: (path: string | null) => void;
  setDocumentName: (name: string) => void;
  markSaved: () => void;
  markDirty: () => void;
  setProjectSettings: (patch: Partial<ProjectSettings>) => void;

  /** Создать группу из узлов (≥1). Возвращает id новой группы или null. */
  createGroup: (nodeIds: string[]) => string | null;
  /** Изменить заголовок группы (коалесится). */
  setGroupTitle: (id: string, title: string) => void;
  /** Изменить цвет заливки / стиль заголовка группы. */
  updateGroup: (id: string, patch: { color?: string; titleStyle?: GroupTitleStyle }) => void;
  /** Удалить группу (сами узлы не трогаются). */
  deleteGroup: (id: string) => void;

  /** Снять снимок текущего дерева в past (для drag — на старте перетаскивания). */
  pushHistory: (category?: HistoryCategory) => void;
  undo: () => void;
  redo: () => void;
}
