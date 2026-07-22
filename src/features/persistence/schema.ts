/**
 * v3: EdgeStyle расширен (sourceArrow/targetArrow: +dot/diamond; taper),
 * layoutType — новый набор LayoutKind (старые 'tree-LR'/'tree-TB'/'radial'
 * мапятся при загрузке).
 * v4: structure-driven модель — позиции больше не источник истины (кроме
 * network). data.order — порядок среди сиблингов; часть layoutType-набора
 * упразднена (free/block/bridge/multiflow/dialogue/flowchart — мапятся на
 * ближайший из оставшихся при загрузке). Все новые поля опциональны —
 * файлы v1–v3 читаются, normalizeStructure чинит недостающую структуру.
 * v4+: `checked` (boolean) заменён на `status` (string, id из BUILTIN_STATUSES
 * или projectSettings.customStatuses) — старые файлы мигрируют checked:true →
 * status:'completed' при загрузке (см. deserializeMindMap).
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
  /**
   * Геометрия пути, выбранная пользователем (v4+): 'straight' | 'bezier' |
   * 'smoothstep' | 'orthogonal' | 'step'. Отсутствие поля = 'auto' (маршрут
   * определяет раскладка) — так читаются все старые файлы; 'auto' никогда не
   * пишется, его вырезает pruneStyle против DEFAULT_EDGE_STYLE.
   */
  routing?: string;
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
    /** Свёрнутые ветки: id прямых потомков со спрятанным поддеревом (v4+). */
    collapsedChildren?: string[];
    /** Legacy (до статусов): true → мигрирует в status:'completed'. */
    checked?: boolean;
    /** Статус узла-задачи — id из BUILTIN_STATUSES или customStatuses (v4+). */
    status?: string;
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

interface SerializedStatusOption {
  id: string;
  labelKey?: string;
  label?: string;
  color: string;
}

interface SerializedProjectSettings {
  handleVisibility?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  edgeColor?: string;
  levelColors?: string[];
  customStatuses?: SerializedStatusOption[];
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
