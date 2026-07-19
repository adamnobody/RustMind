/**
 * v3: EdgeStyle расширен (sourceArrow/targetArrow: +dot/diamond; taper),
 * layoutType — новый набор LayoutKind (старые 'tree-LR'/'tree-TB'/'radial'
 * мапятся при загрузке).
 * v4: structure-driven модель — позиции больше не источник истины (кроме
 * network). data.order — порядок среди сиблингов; часть layoutType-набора
 * упразднена (free/block/bridge/multiflow/dialogue/flowchart — мапятся на
 * ближайший из оставшихся при загрузке). Все новые поля опциональны —
 * файлы v1–v3 читаются, normalizeStructure чинит недостающую структуру.
 */
export const FILE_VERSION = 4;
export const FILE_EXTENSION = 'rustmind';

interface SerializedNodeStyle {
  shape?: string;
  borderPattern?: string;
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

interface SerializedEdgeStyle {
  linePattern?: string;
  strokeWidth?: number;
  strokeColor?: string;
  sourceArrow?: string;
  targetArrow?: string;
  taper?: boolean;
  label?: string;
  labelFontSize?: number;
  labelColor?: string;
}

export interface SerializedNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    color?: string;
    textColor?: string;
    collapsed?: boolean;
    checked?: boolean;
    isRoot?: boolean;
    note?: string;
    style?: SerializedNodeStyle;
    /** Смещения хэндлов (проценты); хранятся только отклонения от центра. */
    handleOffsets?: Record<string, number>;
    /** Порядок среди сиблингов (v4+). Отсутствие — normalizeStructure забэкфиллит. */
    order?: number;
  };
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: { kind?: string; style?: SerializedEdgeStyle };
}

interface SerializedProjectSettings {
  handleVisibility?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  edgeColor?: string;
  levelColors?: string[];
}

interface SerializedGroupTitleStyle {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

export interface SerializedGroup {
  id: string;
  title: string;
  nodeIds: string[];
  color?: string;
  titleStyle?: SerializedGroupTitleStyle;
}

export interface SerializedMindMap {
  version: number;
  documentName: string;
  layoutType: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  groups?: SerializedGroup[];
  projectSettings?: SerializedProjectSettings;
  createdAt: string;
  updatedAt: string;
}
