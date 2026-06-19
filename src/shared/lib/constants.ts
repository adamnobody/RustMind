import type { Size } from '../types/common';

/** Дефолтные размеры узла (используются для dagre и измерений) */
export const DEFAULT_NODE_SIZE: Size = {
  width: 180,
  height: 48,
};

/** Размеры корневого узла */
export const ROOT_NODE_SIZE: Size = {
  width: 220,
  height: 56,
};

/** Отступы для dagre layout */
export const LAYOUT_SPACING = {
  rankSep: 120, // расстояние между уровнями
  nodeSep: 40,  // расстояние между узлами одного уровня
} as const;

/** Палитра цветов для узлов (по умолчанию и для выбора) */
export const NODE_COLORS = {
  root: '#2563eb',
  default: '#1e293b',
  palette: ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2'],
} as const;

/** Тексты по умолчанию */
export const DEFAULT_LABELS = {
  root: 'Главная тема',
  child: 'Новая идея',
} as const;

/** Идентификаторы горячих клавиш (для useHotkeys) */
export const HOTKEYS = {
  addChild: 'Tab',
  addSibling: 'Enter',
  deleteNode: 'Delete',
  deleteNodeAlt: 'Backspace',
  editNode: 'F2',
  exitEdit: 'Escape',
  save: 'mod+s',
  open: 'mod+o',
  newMap: 'mod+n',
} as const;
