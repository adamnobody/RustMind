/** Именованные палитры: корень + цвета потомков по глубине. */
export interface LevelPalette {
  id: string;
  /** TranslationKey: palette.{id} */
  root: string;
  levels: string[];
}

/**
 * Восемь спокойных палитр: корень темнее, каждый следующий уровень светлее
 * и чуть сдвинут по тону — глубина читается, соседние уровни не сливаются.
 */
export const LEVEL_PALETTES: readonly LevelPalette[] = [
  {
    id: 'ocean',
    root: '#0f4c75',
    levels: ['#1b6b93', '#2e8ba8', '#3da5b8', '#5bc0be'],
  },
  {
    id: 'forest',
    root: '#1b4332',
    levels: ['#2d6a4f', '#40916c', '#52b788', '#74c69d'],
  },
  {
    id: 'sunset',
    root: '#9a3412',
    levels: ['#c2410c', '#ea580c', '#f59e0b', '#eab308'],
  },
  {
    id: 'iris',
    root: '#3c1361',
    levels: ['#5b21b6', '#7c3aed', '#8b5cf6', '#a78bfa'],
  },
  {
    id: 'coral',
    root: '#9f1239',
    levels: ['#e11d48', '#f43f5e', '#fb7185', '#fda4af'],
  },
  {
    id: 'graphite',
    root: '#0f172a',
    levels: ['#1e293b', '#334155', '#475569', '#64748b'],
  },
  {
    id: 'honey',
    root: '#78350f',
    levels: ['#b45309', '#d97706', '#f59e0b', '#fbbf24'],
  },
  {
    id: 'fog',
    root: '#2e3440',
    levels: ['#4c566a', '#5e81ac', '#81a1c1', '#88c0d0'],
  },
] as const;

export type LevelPaletteId = (typeof LEVEL_PALETTES)[number]['id'];

/** Корень + четыре уровня потомков — как у готовых палитр. */
export const PALETTE_STOPS = 5;

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    const r = Number.parseInt(h[0]! + h[0], 16);
    const g = Number.parseInt(h[1]! + h[1], 16);
    const b = Number.parseInt(h[2]! + h[2], 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b } : null;
  }
  if (h.length === 6) {
    const r = Number.parseInt(h.slice(0, 2), 16);
    const g = Number.parseInt(h.slice(2, 4), 16);
    const b = Number.parseInt(h.slice(4, 6), 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b } : null;
  }
  return null;
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function normalizeHex(hex: string): string | undefined {
  const rgb = parseHex(hex);
  return rgb ? toHex(rgb.r, rgb.g, rgb.b) : undefined;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = (l > 0.5 ? d / (2 - max - min) : d / (max + min)) * 100;
  let h = 0;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;
  return { h: h * 360, s, l: l * 100 };
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  if (ss === 0) {
    const v = ll * 255;
    return toHex(v, v, v);
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  return toHex(hue2rgb(p, q, hh + 1 / 3) * 255, hue2rgb(p, q, hh) * 255, hue2rgb(p, q, hh - 1 / 3) * 255);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Палитра от цвета узла: этот цвет остаётся на его глубине, к корню — темнее,
 * к листьям — светлее, с лёгким сдвигом тона (как у готовых наборов).
 */
export function paletteFromSeed(hex: string, depth = 0): Pick<LevelPalette, 'root' | 'levels'> | undefined {
  const rgb = parseHex(hex);
  if (!rgb) return undefined;
  const seed = toHex(rgb.r, rgb.g, rgb.b);
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const idx = clamp(Math.round(depth), 0, PALETTE_STOPS - 1);
  const colors: string[] = [];
  for (let i = 0; i < PALETTE_STOPS; i++) {
    if (i === idx) {
      colors.push(seed);
      continue;
    }
    const delta = i - idx;
    colors.push(
      hslToHex(h + delta * 5, clamp(s - delta * 4, 22, 86), clamp(l + delta * 9, 14, 78)),
    );
  }
  return { root: colors[0]!, levels: colors.slice(1) };
}

/** Тёмный/светлый текст поверх заливки, чтобы палитра читалась в обеих темах. */
export function inkOnHex(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return '#eafcff';
  const y = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return y >= 150 ? '#0a1a22' : '#eafcff';
}

/** Цвет потомка на глубине `depth` (корень = 0). Пустые слоты пропускаются, дальше — цикл. */
export function levelColorAt(colors: string[] | undefined, depth: number): string | undefined {
  if (!colors || depth < 1) return undefined;
  const filled = colors.filter((c) => c);
  if (filled.length === 0) return undefined;
  return filled[(depth - 1) % filled.length];
}

export function matchingPaletteId(
  rootColor: string | undefined,
  levels: string[] | undefined,
): LevelPaletteId | undefined {
  const root = rootColor ? normalizeHex(rootColor) : undefined;
  if (!root || !levels?.length) return undefined;
  return LEVEL_PALETTES.find((p) => {
    if (p.root !== root || p.levels.length !== levels.length) return false;
    return p.levels.every((c, i) => c === normalizeHex(levels[i] ?? ''));
  })?.id;
}
