/**
 * Тип раскладки документа. 'free' — нулевой режим: позиции как есть, любые
 * связи (текущее поведение приложения, сохранённое как один из режимов).
 * Остальные — типизированные mind-map-раскладки со своими ограничениями
 * (см. features/layout/strategies).
 */
export type LayoutKind =
  | 'free'
  | 'hierarchy'
  | 'block'
  | 'fishbone'
  | 'network'
  | 'bubble'
  | 'bridge'
  | 'multiflow'
  | 'dialogue'
  | 'tree'
  | 'flowchart';

export const LAYOUT_KINDS: LayoutKind[] = [
  'free',
  'hierarchy',
  'block',
  'fishbone',
  'network',
  'bubble',
  'bridge',
  'multiflow',
  'dialogue',
  'tree',
  'flowchart',
];

export const DEFAULT_LAYOUT_KIND: LayoutKind = 'free';

/**
 * Значения layoutType из файлов до версии 3. Старые файлы открываются без
 * ошибок: значение мапится на ближайший новый тип, позиции узлов при этом
 * не трогаются (пересчёт — только по явной пересборке).
 */
export const LEGACY_LAYOUT_MAP: Record<string, LayoutKind> = {
  'tree-LR': 'hierarchy',
  'tree-TB': 'hierarchy',
  radial: 'tree',
};

export function coerceLayoutKind(value: string): LayoutKind {
  if (LAYOUT_KINDS.includes(value as LayoutKind)) return value as LayoutKind;
  return LEGACY_LAYOUT_MAP[value] ?? DEFAULT_LAYOUT_KIND;
}

/** Совместимость со старым именем типа (store, persistence). */
export type LayoutType = LayoutKind;
