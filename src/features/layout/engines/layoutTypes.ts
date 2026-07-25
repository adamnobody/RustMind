import type { LayoutKind } from '../../../domain/mind-map';

export type { LayoutKind, LayoutType } from '../../../domain/mind-map';

export const LAYOUT_KINDS: LayoutKind[] = [
  'hierarchy',
  'right',
  'left',
  'both',
  'tree',
  'org',
  'logic',
  'fishbone',
  'timeline',
  'bubble',
  'network',
  'free',
];

export const DEFAULT_LAYOUT_KIND: LayoutKind = 'hierarchy';

/**
 * Значения layoutType из файлов до версии 4 (включая уже удалённые типы
 * 'block'/'bridge'/'multiflow'/'dialogue'/'flowchart' — 'free' восстановлен и
 * больше не легаси). Старые файлы открываются без ошибок: значение мапится на
 * ближайший из оставшихся типов.
 */
export const LEGACY_LAYOUT_MAP: Record<string, LayoutKind> = {
  'tree-LR': 'hierarchy',
  'tree-TB': 'hierarchy',
  radial: 'tree',
  block: 'hierarchy',
  bridge: 'hierarchy',
  multiflow: 'hierarchy',
  dialogue: 'hierarchy',
  flowchart: 'hierarchy',
};

export function coerceLayoutKind(value: string): LayoutKind {
  if (LAYOUT_KINDS.includes(value as LayoutKind)) return value as LayoutKind;
  return LEGACY_LAYOUT_MAP[value] ?? DEFAULT_LAYOUT_KIND;
}
