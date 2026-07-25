import type {
  NodeStyle,
  StatusOption,
} from '../../domain/mind-map';

export type {
  BorderPattern,
  HandleOffsets,
  HandleSide,
  MindNodeData,
  NodeShape,
  NodeStyle,
  StatusOption,
} from '../../domain/mind-map';

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

export const DEFAULT_HANDLE_OFFSET = 50;

export const MIND_NODE_TYPE = 'mindNode' as const;
export type MindNodeType = typeof MIND_NODE_TYPE;
