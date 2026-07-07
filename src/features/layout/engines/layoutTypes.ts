/**
 * Тип раскладки документа. Позиции узлов всегда вычисляются движком раскладки
 * из структуры дерева — пользователь редактирует только структуру. Исключение
 * — 'network' (force-directed, хранит собственные мягкие позиции, допускает
 * произвольные связи и циклы). См. features/layout/strategies.
 */
export type LayoutKind = 'hierarchy' | 'fishbone' | 'network' | 'bubble' | 'tree';

export const LAYOUT_KINDS: LayoutKind[] = ['hierarchy', 'fishbone', 'network', 'bubble', 'tree'];

export const DEFAULT_LAYOUT_KIND: LayoutKind = 'hierarchy';

/**
 * Значения layoutType из файлов до версии 4 (включая уже удалённые типы
 * 'free'/'block'/'bridge'/'multiflow'/'dialogue'/'flowchart'). Старые файлы
 * открываются без ошибок: значение мапится на ближайший из оставшихся типов.
 */
export const LEGACY_LAYOUT_MAP: Record<string, LayoutKind> = {
  'tree-LR': 'hierarchy',
  'tree-TB': 'hierarchy',
  radial: 'tree',
  free: 'hierarchy',
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

/** Совместимость со старым именем типа (store, persistence). */
export type LayoutType = LayoutKind;
