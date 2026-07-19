import type { TranslationKey } from '../../shared/i18n/translations';

export type NodeShape = 'rect' | 'rounded' | 'ellipse' | 'diamond';
export type BorderPattern = 'solid' | 'dashed' | 'dotted' | 'none';

/**
 * Per-element node style override. All fields optional — absent = use default.
 * Shape, border*, fontSize, fontFamily are rendered starting from step 13.
 * Declaration lives here now so step 13 is "add a field", not "redesign the schema".
 */
export interface NodeStyle {
  shape?: NodeShape;
  borderPattern?: BorderPattern;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  /** Начертание текста узла — как и остальные поля, храним только отклонения от дефолта (false). */
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/** Skeleton defaults — used at render time via { ...DEFAULT_NODE_STYLE, ...node.data.style }. */
export const DEFAULT_NODE_STYLE: Required<NodeStyle> = {
  shape: 'rounded',
  borderPattern: 'solid',
  borderColor: 'var(--rm-node-border)',
  borderWidth: 1,
  backgroundColor: 'var(--rm-node-bg)',
  textColor: 'var(--rm-text)',
  fontSize: 14,
  fontFamily: 'inherit',
  bold: false,
  italic: false,
  underline: false,
};

/**
 * Статус узла-задачи: 'pending'/'in-progress'/'completed'/'failed' (встроенные,
 * см. {@link BUILTIN_STATUSES}) или id пользовательского статуса из
 * `projectSettings.customStatuses`. Каждый узел хранит статус независимо —
 * смена статуса родителя НИКОГДА не каскадится на детей (см. mindMapStore).
 */
export interface StatusOption {
  id: string;
  /** Ключ перевода — только для встроенных статусов. */
  labelKey?: TranslationKey;
  /** Текст пользовательского статуса (введён через "Добавить свой статус"). */
  label?: string;
  color: string;
}

export const BUILTIN_STATUSES: StatusOption[] = [
  { id: 'pending', labelKey: 'status.pending', color: '#9aa5b1' },
  { id: 'in-progress', labelKey: 'status.inProgress', color: '#f2b90c' },
  { id: 'completed', labelKey: 'status.completed', color: '#3ecf6e' },
  { id: 'failed', labelKey: 'status.failed', color: '#f0506e' },
];

/** Ищет статус по id среди встроенных и пользовательских (документа). */
export function findStatus(
  id: string | undefined,
  customStatuses: StatusOption[] | undefined,
): StatusOption | undefined {
  if (!id) return undefined;
  return BUILTIN_STATUSES.find((s) => s.id === id) ?? customStatuses?.find((s) => s.id === id);
}

/** Сторона узла — совпадает с id хэндлов в NodeHandles. */
export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

/**
 * Per-node смещение точек соединения вдоль своей стороны, в процентах (0–100).
 * Отсутствие ключа = центр стороны (DEFAULT_HANDLE_OFFSET); храним только
 * отклонения — тот же принцип «дефолт не хранится», что и в NodeStyle.
 */
export type HandleOffsets = Partial<Record<HandleSide, number>>;

export const DEFAULT_HANDLE_OFFSET = 50;

export interface MindNodeData {
  label: string;
  color?: string;
  textColor?: string;
  /**
   * Legacy: свернуть ВЕСЬ узел (спрятать всех потомков). Больше не выставляется
   * из UI — сохранён для чтения старых файлов. Новое сворачивание — по ветке
   * ({@link collapsedChildren}).
   */
  collapsed?: boolean;
  /**
   * Свёрнутые ВЕТКИ этого узла: id прямых потомков, чьё поддерево спрятано.
   * Каждая ветка сворачивается независимо (кнопка на стороне, куда она уходит).
   * Храним только свёрнутые — пустой список не пишется.
   */
  collapsedChildren?: string[];
  isRoot?: boolean;
  note?: string;
  /**
   * Статус узла-задачи (см. {@link StatusOption}). Отсутствие — узел без
   * статуса. Прогресс родителя считается по статусам потомков-листьев
   * (subtreeProgress в MindNode.tsx), независимо от статуса самого родителя.
   */
  status?: string;
  style?: NodeStyle;
  handleOffsets?: HandleOffsets;
  /**
   * Транзиентный цвет уровня из глобальных настроек проекта (projectSettings.levelColors).
   * Внедряется канвасом на лету, НЕ сериализуется — самый низкий приоритет фона.
   */
  levelColor?: string;
  /**
   * Порядок среди сиблингов (структурная модель раскладки). Опционально на
   * границе типов/сериализации, но после normalizeStructure у каждого узла в
   * рантайме есть конкретное значение — не хранится только для network.
   */
  order?: number;
  [key: string]: unknown; // требование @xyflow/react v12 для Record-совместимости
}

export const MIND_NODE_TYPE = 'mindNode' as const;
export type MindNodeType = typeof MIND_NODE_TYPE;
