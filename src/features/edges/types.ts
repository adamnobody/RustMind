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
  sourceArrow?: EdgeArrowType;
  targetArrow?: EdgeArrowType;
  /** Inline label text rendered on the edge path — wired up in step 15. */
  label?: string;
}

/** Skeleton defaults — merged at render time. label has no universal default. */
export const DEFAULT_EDGE_STYLE: Required<Omit<EdgeStyle, 'label'>> = {
  linePattern: 'solid',
  strokeWidth: 2,
  strokeColor: 'var(--rm-edge)',
  sourceArrow: 'none',
  targetArrow: 'none',
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
