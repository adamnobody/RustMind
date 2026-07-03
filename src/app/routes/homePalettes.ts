import type { HomePalette, Theme } from '../../store/uiStore';

export interface HomePaletteDef {
  label: string;
  /** Тройка для тёмной темы — глубокие, приглушённые тона, не слепят на тёмном. */
  dark: [string, string, string];
  /** Тройка для светлой темы — чистые, светящиеся тона под пастельную размывку. */
  light: [string, string, string];
}

/**
 * Палитры «жидкого» фона главного меню. Одна и та же палитра выглядит
 * по-разному в темах: тёмная тема получает затемнённые варианты цветов
 * (яркие тройки на тёмном фоне выжигали картинку), светлая — исходные яркие.
 * Палитра iridescent в светлом варианте — прямая цитата hero-градиента из
 * дизайн-референса (шалфей → расплавленный янтарь → оксблад).
 */
export const HOME_PALETTES: Record<HomePalette, HomePaletteDef> = {
  // Тёмные тройки — «драгоценные» тона (тёмные, но с высокой чромой):
  // просто затемнённые версии светлых на тёмном фоне смешивались в грязь.
  iridescent: {
    label: 'Перелив',
    dark: ['#2f9e63', '#cf7f12', '#96261f'],
    light: ['#a0e0ab', '#ffac2e', '#a52d25'],
  },
  aurora: {
    label: 'Аврора',
    dark: ['#0d9488', '#2563eb', '#7c3aed'],
    light: ['#6ee7b7', '#93c5fd', '#c084fc'],
  },
  sunset: {
    label: 'Закат',
    dark: ['#be185d', '#c2410c', '#6d28d9'],
    light: ['#f9a8d4', '#fdba74', '#a78bfa'],
  },
  ocean: {
    label: 'Океан',
    dark: ['#0e7490', '#1d4ed8', '#0f766e'],
    light: ['#67e8f9', '#60a5fa', '#5eead4'],
  },
  mono: {
    label: 'Графит',
    dark: ['#475569', '#303c4f', '#171f2e'],
    light: ['#cbd5e1', '#94a3b8', '#64748b'],
  },
};

/** Тройка цветов палитры для активной темы. */
export function paletteColors(palette: HomePalette, theme: Theme): [string, string, string] {
  const def = HOME_PALETTES[palette] ?? HOME_PALETTES.iridescent;
  return theme === 'light' ? def.light : def.dark;
}
