import type { HomePalette } from '../../store/uiStore';

/**
 * Тройки цветов «жидкого» фона главного меню. Палитра iridescent — прямая
 * цитата hero-градиента из дизайн-референса (шалфей → расплавленный янтарь →
 * оксблад); остальные построены по тому же принципу «три далёкие точки
 * спектра, растворяющиеся друг в друге».
 */
export const HOME_PALETTES: Record<
  HomePalette,
  { label: string; colors: [string, string, string] }
> = {
  iridescent: { label: 'Перелив', colors: ['#a0e0ab', '#ffac2e', '#a52d25'] },
  aurora: { label: 'Аврора', colors: ['#34d399', '#5b8cff', '#9333ea'] },
  sunset: { label: 'Закат', colors: ['#f472b6', '#fb923c', '#7c3aed'] },
  ocean: { label: 'Океан', colors: ['#22d3ee', '#2563eb', '#0f766e'] },
  mono: { label: 'Графит', colors: ['#94a3b8', '#64748b', '#334155'] },
};
