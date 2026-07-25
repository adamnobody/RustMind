import type { EdgeStyle } from '../../domain/mind-map';

export type {
  EdgeArrowType,
  EdgeKind,
  EdgeLinePattern,
  EdgeRoutingChoice,
  EdgeStyle,
  MindEdgeData,
} from '../../domain/mind-map';

/**
 * Skeleton defaults — merged at render time and used by the serializer to strip
 * fields equal to their default (single source, same as DEFAULT_NODE_STYLE).
 * `label` is intentionally excluded: free text has no universal default.
 */
export const DEFAULT_EDGE_STYLE: Required<Omit<EdgeStyle, 'label'>> = {
  routing: 'auto',
  linePattern: 'solid',
  strokeWidth: 2,
  strokeColor: 'var(--rm-edge)',
  sourceArrow: 'none',
  targetArrow: 'none',
  taper: false,
  labelFontSize: 12,
  labelColor: 'var(--rm-text)',
};

export { isTreeEdge } from '../../domain/mind-map';

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
