/**
 * Чистая геометрия прокладки рёбер. Централизованный фикс роутинга: порты
 * выбираются ДИНАМИЧЕСКИ по взаимному положению нод (точка на границе
 * прямоугольника, обращённая к другому концу), а не фиксированной стороной;
 * кривизна Безье пропорциональна расстоянию с клампом. Никаких импортов из
 * стора/React — модуль тестируется как есть.
 */

export type EdgeRouting = 'orthogonal' | 'bezier' | 'radial' | 'straight' | 'fixed';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PortSide = 'top' | 'right' | 'bottom' | 'left';

/** Точка присоединения ребра: лежит на границе ноды, знает свою сторону. */
export interface Port extends Point {
  side: PortSide;
}

/** Контрольные точки кубической Безье (для рендера и taper-сэмплирования). */
export interface CubicControls {
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
}

export interface RoutedEdge {
  /** SVG-путь от порта до порта (стрелки считаются от этих точек). */
  path: string;
  /** Середина ВИДИМОЙ траектории (не отрезка центр-центр) — позиция подписи. */
  labelX: number;
  labelY: number;
  source: Port;
  target: Port;
  /** Есть у всех кривых/прямых маршрутов; отсутствует только у orthogonal. */
  curve?: CubicControls;
}

/** Кривизна по расстоянию, не константа: clamp(dist * k, min, max). */
export const BEZIER_OFFSET_MIN = 24;
export const BEZIER_OFFSET_MAX = 130;

export function bezierOffset(distance: number, k = 0.3): number {
  return Math.min(BEZIER_OFFSET_MAX, Math.max(BEZIER_OFFSET_MIN, distance * k));
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

const SIDE_NORMALS: Record<PortSide, Point> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

/**
 * Ядро фикса: пересечение отрезка (центр ноды → toward) с прямоугольником
 * ноды — точка выхода/входа ребра. Порт всегда на границе, обращён к другому
 * концу; сторона определяется тем, какую грань пересёк луч.
 */
export function portToward(rect: Rect, toward: Point): Port {
  const c = rectCenter(rect);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  const hw = rect.width / 2;
  const hh = rect.height / 2;
  if ((dx === 0 && dy === 0) || hw === 0 || hh === 0) {
    // Вырожденный случай (совпавшие центры / нулевой прямоугольник-fallback).
    return { x: c.x + hw, y: c.y, side: 'right' };
  }
  const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  const side: PortSide = tx <= ty ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top');
  return { x: c.x + dx * t, y: c.y + dy * t, side };
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

function cubicPath(sp: Point, c: CubicControls, tp: Point): string {
  return `M ${r2(sp.x)} ${r2(sp.y)} C ${r2(c.c1x)} ${r2(c.c1y)}, ${r2(c.c2x)} ${r2(c.c2y)}, ${r2(tp.x)} ${r2(tp.y)}`;
}

/** Точка кубической Безье в t=0.5 — середина видимой траектории для label. */
function cubicMidpoint(sp: Point, c: CubicControls, tp: Point): Point {
  return {
    x: (sp.x + 3 * c.c1x + 3 * c.c2x + tp.x) / 8,
    y: (sp.y + 3 * c.c1y + 3 * c.c2y + tp.y) / 8,
  };
}

/**
 * bezier-directional: порты по пересечению с рамкой, контрольные точки — по
 * НАПРАВЛЕНИЮ ПОРТА (выход перпендикулярно стороне ноды), кривизна
 * пропорциональна расстоянию с разумным максимумом.
 */
function bezierFromPorts(sp: Port, tp: Port): RoutedEdge {
  const dist = Math.hypot(tp.x - sp.x, tp.y - sp.y);
  const off = bezierOffset(dist);
  const sn = SIDE_NORMALS[sp.side];
  const tn = SIDE_NORMALS[tp.side];
  const curve: CubicControls = {
    c1x: sp.x + sn.x * off,
    c1y: sp.y + sn.y * off,
    c2x: tp.x + tn.x * off,
    c2y: tp.y + tn.y * off,
  };
  const mid = cubicMidpoint(sp, curve, tp);
  return { path: cubicPath(sp, curve, tp), labelX: mid.x, labelY: mid.y, source: sp, target: tp, curve };
}

function routeBezier(sourceRect: Rect, targetRect: Rect): RoutedEdge {
  const sp = portToward(sourceRect, rectCenter(targetRect));
  const tp = portToward(targetRect, rectCenter(sourceRect));
  return bezierFromPorts(sp, tp);
}

/**
 * fixed: НЕ пересчитывает порт геометрией — берёт точку и сторону РЕАЛЬНОГО
 * хэндла ребра как есть (включая per-node handleOffsets). Нужен для раскладок,
 * где позиция ноды никак не связана со стороной подключения (free): порт
 * должен оставаться там, где его поставил пользователь/раскладка, а не
 * «соскальзывать» к грани, обращённой на текущего соседа.
 */
export function routeFixed(sp: Port, tp: Port): RoutedEdge {
  return bezierFromPorts(sp, tp);
}

/**
 * radial: порт смотрит вдоль луча к другому концу (для радиальных раскладок
 * этот луч проходит через центр композиции), контрольные точки — вдоль
 * направления порта → почти прямые «спицы» без раздутых дуг.
 */
function routeRadial(sourceRect: Rect, targetRect: Rect): RoutedEdge {
  const sp = portToward(sourceRect, rectCenter(targetRect));
  const tp = portToward(targetRect, rectCenter(sourceRect));
  const sc = rectCenter(sourceRect);
  const tc = rectCenter(targetRect);
  const dist = Math.hypot(tp.x - sp.x, tp.y - sp.y);
  const off = bezierOffset(dist, 0.25);
  // Направление порта = от центра своей ноды к порту (радиальный вектор).
  const dir = (from: Point, port: Point): Point => {
    const len = Math.hypot(port.x - from.x, port.y - from.y) || 1;
    return { x: (port.x - from.x) / len, y: (port.y - from.y) / len };
  };
  const sd = dir(sc, sp);
  const td = dir(tc, tp);
  const curve: CubicControls = {
    c1x: sp.x + sd.x * off,
    c1y: sp.y + sd.y * off,
    c2x: tp.x + td.x * off,
    c2y: tp.y + td.y * off,
  };
  const mid = cubicMidpoint(sp, curve, tp);
  return { path: cubicPath(sp, curve, tp), labelX: mid.x, labelY: mid.y, source: sp, target: tp, curve };
}

/** straight-diagonal (fishbone): прямая под углом ветви, порт на рамке. */
function routeStraight(sourceRect: Rect, targetRect: Rect): RoutedEdge {
  const sp = portToward(sourceRect, rectCenter(targetRect));
  const tp = portToward(targetRect, rectCenter(sourceRect));
  // Контрольные точки на самой прямой (⅓ и ⅔) — единый cubic-контракт для
  // taper-сэмплирования, геометрия при этом строго прямая.
  const curve: CubicControls = {
    c1x: sp.x + (tp.x - sp.x) / 3,
    c1y: sp.y + (tp.y - sp.y) / 3,
    c2x: sp.x + (2 * (tp.x - sp.x)) / 3,
    c2y: sp.y + (2 * (tp.y - sp.y)) / 3,
  };
  return {
    path: `M ${r2(sp.x)} ${r2(sp.y)} L ${r2(tp.x)} ${r2(tp.y)}`,
    labelX: (sp.x + tp.x) / 2,
    labelY: (sp.y + tp.y) / 2,
    source: sp,
    target: tp,
    curve,
  };
}

/**
 * orthogonal: только H/V сегменты, углы 90°. Порты на обращённых друг к другу
 * сторонах по доминирующей оси: право→лево между колонками, низ→верх между
 * уровнями. Подпись — на середине среднего сегмента.
 */
function routeOrthogonal(sourceRect: Rect, targetRect: Rect): RoutedEdge {
  const sc = rectCenter(sourceRect);
  const tc = rectCenter(targetRect);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sp: Port =
      dx >= 0
        ? { x: sourceRect.x + sourceRect.width, y: sc.y, side: 'right' }
        : { x: sourceRect.x, y: sc.y, side: 'left' };
    const tp: Port =
      dx >= 0
        ? { x: targetRect.x, y: tc.y, side: 'left' }
        : { x: targetRect.x + targetRect.width, y: tc.y, side: 'right' };
    const mx = (sp.x + tp.x) / 2;
    return {
      path: `M ${r2(sp.x)} ${r2(sp.y)} L ${r2(mx)} ${r2(sp.y)} L ${r2(mx)} ${r2(tp.y)} L ${r2(tp.x)} ${r2(tp.y)}`,
      labelX: mx,
      labelY: (sp.y + tp.y) / 2,
      source: sp,
      target: tp,
    };
  }

  const sp: Port =
    dy >= 0
      ? { x: sc.x, y: sourceRect.y + sourceRect.height, side: 'bottom' }
      : { x: sc.x, y: sourceRect.y, side: 'top' };
  const tp: Port =
    dy >= 0
      ? { x: tc.x, y: targetRect.y, side: 'top' }
      : { x: tc.x, y: targetRect.y + targetRect.height, side: 'bottom' };
  const my = (sp.y + tp.y) / 2;
  return {
    path: `M ${r2(sp.x)} ${r2(sp.y)} L ${r2(sp.x)} ${r2(my)} L ${r2(tp.x)} ${r2(my)} L ${r2(tp.x)} ${r2(tp.y)}`,
    labelX: (sp.x + tp.x) / 2,
    labelY: my,
    source: sp,
    target: tp,
  };
}

/** Единая точка входа рендера: маршрут по декларации стратегии. */
export function routeEdge(sourceRect: Rect, targetRect: Rect, routing: EdgeRouting): RoutedEdge {
  switch (routing) {
    case 'orthogonal':
      return routeOrthogonal(sourceRect, targetRect);
    case 'radial':
      return routeRadial(sourceRect, targetRect);
    case 'straight':
      return routeStraight(sourceRect, targetRect);
    default:
      return routeBezier(sourceRect, targetRect);
  }
}
