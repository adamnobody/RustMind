import type { CSSProperties } from 'react';
import type { GroupTitlePlacement, GroupTitleSide } from '../../domain/mind-map';

export const TITLE_SIDES: GroupTitleSide[] = ['top', 'right', 'bottom', 'left'];

export const DEFAULT_TITLE_PLACEMENT: GroupTitlePlacement = { side: 'top', offset: 0.08 };

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function isTitleSide(value: unknown): value is GroupTitleSide {
  return value === 'top' || value === 'right' || value === 'bottom' || value === 'left';
}

/**
 * Проецирует точку (локальные CSS-пиксели бокса) на ближайшую сторону рамки.
 * Заголовок всегда «прилипает» к периметру — внутри прямоугольника он не живёт.
 */
export function snapTitleToBorder(x: number, y: number, w: number, h: number): GroupTitlePlacement {
  if (w <= 0 || h <= 0) return { ...DEFAULT_TITLE_PLACEMENT };
  const cx = Math.min(Math.max(x, 0), w);
  const cy = Math.min(Math.max(y, 0), h);
  const dist = {
    top: cy,
    bottom: h - cy,
    left: cx,
    right: w - cx,
  };
  let side: GroupTitleSide = 'top';
  let best = dist.top;
  for (const s of TITLE_SIDES) {
    if (dist[s] < best) {
      best = dist[s];
      side = s;
    }
  }
  const offset = side === 'top' || side === 'bottom' ? cx / w : cy / h;
  return { side, offset: clamp01(offset) };
}

/** Абсолютная позиция чипа заголовка: центр чипа сидит на выбранной точке периметра. */
export function titleChipStyle(placement: GroupTitlePlacement): CSSProperties {
  const offset = `${clamp01(placement.offset) * 100}%`;
  switch (placement.side) {
    case 'right':
      return { top: offset, left: '100%', transform: 'translate(-50%, -50%)' };
    case 'bottom':
      return { top: '100%', left: offset, transform: 'translate(-50%, -50%)' };
    case 'left':
      return { top: offset, left: 0, transform: 'translate(-50%, -50%)' };
    default:
      return { top: 0, left: offset, transform: 'translate(-50%, -50%)' };
  }
}
