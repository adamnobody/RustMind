/** Базовые данные документа. Этот модуль не зависит от UI, store или persistence. */

export type LayoutKind =
  | 'hierarchy'
  | 'right'
  | 'left'
  | 'both'
  | 'tree'
  | 'org'
  | 'logic'
  | 'fishbone'
  | 'timeline'
  | 'bubble'
  | 'network'
  | 'free';

export type LayoutType = LayoutKind;

export type NodeShape = 'rect' | 'rounded' | 'ellipse' | 'diamond';
export type BorderPattern = 'solid' | 'dashed' | 'dotted' | 'none';

export interface NodeStyle {
  shape?: NodeShape;
  borderPattern?: BorderPattern;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface StatusOption {
  id: string;
  labelKey?: string;
  label?: string;
  color: string;
}

export type HandleSide = 'top' | 'right' | 'bottom' | 'left';
export type HandleOffsets = Partial<Record<HandleSide, number>>;

export interface MindNodeData {
  label: string;
  color?: string;
  textColor?: string;
  collapsed?: boolean;
  collapsedChildren?: string[];
  isRoot?: boolean;
  note?: string;
  status?: string;
  style?: NodeStyle;
  handleOffsets?: HandleOffsets;
  levelColor?: string;
  order?: number;
  [key: string]: unknown;
}

export type EdgeLinePattern = 'solid' | 'dashed' | 'dotted';
export type EdgeArrowType = 'none' | 'open' | 'filled' | 'dot' | 'diamond';
export type EdgeGeometry = 'straight' | 'bezier' | 'smoothstep' | 'orthogonal' | 'step';
export type EdgeRoutingChoice = 'auto' | EdgeGeometry;
export type EdgeKind = 'tree' | 'free';

export interface EdgeStyle {
  linePattern?: EdgeLinePattern;
  routing?: EdgeRoutingChoice;
  strokeWidth?: number;
  strokeColor?: string;
  sourceArrow?: EdgeArrowType;
  targetArrow?: EdgeArrowType;
  taper?: boolean;
  label?: string;
  labelFontSize?: number;
  labelColor?: string;
}

export interface MindEdgeData {
  kind?: EdgeKind;
  style?: EdgeStyle;
  invalid?: boolean;
  [key: string]: unknown;
}

export interface GroupTitleStyle {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

/** Сторона рамки, на которой сидит блок заголовка. */
export type GroupTitleSide = 'top' | 'right' | 'bottom' | 'left';

/**
 * Якорь заголовка на периметре группы. `offset` — доля 0..1 вдоль стороны
 * (слева направо для top/bottom, сверху вниз для left/right).
 */
export interface GroupTitlePlacement {
  side: GroupTitleSide;
  offset: number;
}

export interface Group {
  id: string;
  title: string;
  nodeIds: string[];
  color?: string;
  /** Скругление углов области (px). Нет поля = дефолт. */
  borderRadius?: number;
  titleStyle?: GroupTitleStyle;
  titlePlacement?: GroupTitlePlacement;
}

export type HandleVisibility = 'hidden' | 'dashed' | 'always';

export interface ProjectSettings {
  handleVisibility: HandleVisibility;
  backgroundColor?: string;
  backgroundImage?: string;
  edgeColor?: string;
  levelColors?: string[];
  customStatuses?: StatusOption[];
  /** Свободные связи: жест рисует ассоциативное ребро без canConnect раскладки. */
  freeLinkMode?: boolean;
}

export interface AppNode {
  id: string;
  position: { x: number; y: number };
  data: MindNodeData;
  type?: string;
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
  hidden?: boolean;
  selected?: boolean;
  dragging?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  focusable?: boolean;
  zIndex?: number;
  style?: object;
}

export interface AppEdge {
  id: string;
  source: string;
  target: string;
  data?: MindEdgeData;
  type?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  hidden?: boolean;
  selected?: boolean;
}

export interface LoadDocumentPayload {
  documentName: string;
  layoutType: LayoutType;
  nodes: AppNode[];
  edges: AppEdge[];
  projectSettings?: ProjectSettings;
  groups?: Group[];
  /** Дата создания из файла; у старых/импортированных файлов может отсутствовать. */
  createdAt?: string;
}

/** Всё, что не помечено явно как free, остаётся структурным ребром для legacy-файлов. */
export function isTreeEdge(edge: { data?: MindEdgeData }): boolean {
  return edge.data?.kind !== 'free';
}
