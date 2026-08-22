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

/** Те же границы, что у RF-ноды группы: bbox членов + padding. */
export function paddedGroupBounds(rects: Rect[], padding: number): Bounds | null {
  const b = groupBounds(rects);
  if (!b) return null;
  return {
    x: b.x - padding,
    y: b.y - padding,
    width: b.width + padding * 2,
    height: b.height + padding * 2,
  };
}

/** Самая маленькая область, содержащая точку — при наложении групп побеждает внутренняя. */
export function smallestBoundsAt(
  items: Array<{ id: string; bounds: Bounds }>,
  point: { x: number; y: number },
): string | null {
  let best: string | null = null;
  let bestArea = Infinity;
  for (const { id, bounds: b } of items) {
    if (point.x < b.x || point.y < b.y || point.x > b.x + b.width || point.y > b.y + b.height) {
      continue;
    }
    const area = b.width * b.height;
    if (area < bestArea) {
      bestArea = area;
      best = id;
    }
  }
  return best;
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
