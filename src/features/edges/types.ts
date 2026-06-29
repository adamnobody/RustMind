export type EdgeLinePattern = 'solid' | 'dashed' | 'dotted';
export type EdgeArrowType = 'none' | 'open' | 'filled';

/**
 * Per-element edge style override. All fields optional — absent = use default.
 * Rendering starts from step 15.
 */
export interface EdgeStyle {
  linePattern?: EdgeLinePattern;
  strokeWidth?: number;
  strokeColor?: string;
  /**
   * DECISION (diverges from step-15 spec): one enum per end instead of the
   * spec's `arrowStart/arrowEnd` (boolean) + `arrowType` (shape). The enum makes
   * illegal states unrepresentable (no "arrow on, but no type" / boolean↔enum
   * conflict): 'none' = no arrow, 'open'/'filled' = arrow of that shape. The
   * "tapering line" note is a render concern, not modelled here.
   */
  sourceArrow?: EdgeArrowType;
  targetArrow?: EdgeArrowType;
  /** Inline label text rendered on the edge path. */
  label?: string;
  /**
   * Label text styling — mirrors NodeStyle's fontSize/textColor for the edge's
   * label. Shared render approach (not duplicated node code) lands in step 15B.
   */
  labelFontSize?: number;
  labelColor?: string;
}

/**
 * Skeleton defaults — merged at render time and used by the serializer to strip
 * fields equal to their default (single source, same as DEFAULT_NODE_STYLE).
 * `label` is intentionally excluded: free text has no universal default.
 */
export const DEFAULT_EDGE_STYLE: Required<Omit<EdgeStyle, 'label'>> = {
  linePattern: 'solid',
  strokeWidth: 2,
  strokeColor: 'var(--rm-edge)',
  sourceArrow: 'none',
  targetArrow: 'none',
  labelFontSize: 12,
  labelColor: 'var(--rm-text)',
};

/**
 * Класс ребра:
 * - 'tree' — структурное ребро родитель→потомок. Хэндлы выводятся из
 *   направления раскладки и переписываются auto-layout'ом.
 * - 'free' — ассоциативная связь, нарисованная пользователем (drag хэндл→узел).
 *   Хэндлы зафиксированы по жесту и layout их не трогает.
 */
export type EdgeKind = 'tree' | 'free';

export interface MindEdgeData {
  kind?: EdgeKind;
  style?: EdgeStyle;
  [key: string]: unknown;
}

/**
 * Структурным считается всё, что НЕ помечено явно как 'free' — в том числе
 * старые рёбра без поля kind (миграция). Только kind === 'free' — свободное.
 * Параметр типизирован структурно, чтобы избежать цикла импорта с store/types.
 */
export function isTreeEdge(edge: { data?: MindEdgeData }): boolean {
  return edge.data?.kind !== 'free';
}

/**
 * Хэндлы по умолчанию для программно созданного структурного ребра (Tab/Enter,
 * где нет жеста drag) и для backfill старых файлов без хэндлов. Зафиксированы —
 * auto-layout их НЕ пересчитывает. Идентификаторы совпадают с id в NodeHandles.
 */
export const DEFAULT_TREE_EDGE_HANDLES = { sourceHandle: 'right', targetHandle: 'left' } as const;

const OPPOSITE_HANDLE: Record<string, string> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/**
 * Противоположная сторона — входной хэндл нового узла при drag-в-пустоту,
 * чтобы линия от утащенного хэндла входила в потомок прямо, без зигзага.
 */
export function oppositeHandle(id: string | null | undefined): string | undefined {
  return id ? OPPOSITE_HANDLE[id] : undefined;
}

export const MIND_EDGE_TYPE = 'mindEdge' as const;
export type MindEdgeType = typeof MIND_EDGE_TYPE;
