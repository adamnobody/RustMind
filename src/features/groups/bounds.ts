export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Ограничивающий прямоугольник набора прямоугольников; null для пустого набора. */
export function groupBounds(rects: Rect[]): Bounds | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Id элементов, чьи прямоугольники пересекают область (хотя бы краем). */
export function idsInArea(items: Array<{ id: string } & Rect>, area: Rect): string[] {
  if (area.w <= 0 || area.h <= 0) return [];
  const out: string[] = [];
  for (const item of items) {
    if (rectsOverlap(item, area)) out.push(item.id);
  }
  return out;
}
