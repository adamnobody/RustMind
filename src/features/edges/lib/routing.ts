/**
 * Чистая геометрия прокладки рёбер. Централизованный фикс роутинга: порты
 * выбираются ДИНАМИЧЕСКИ по взаимному положению нод (точка на границе
 * прямоугольника, обращённая к другому концу), а не фиксированной стороной;
 * кривизна Безье пропорциональна расстоянию с клампом. Никаких импортов из
 * стора/React — модуль тестируется как есть.
 */

export type EdgeRouting = 'orthogonal' | 'bezier' | 'radial' | 'straight' | 'fixed';

/**
 * Пользовательская ГЕОМЕТРИЯ пути (выбор в инспекторе) — не путать с
 * EdgeRouting (декларация раскладки) и не путать с оформлением штриха
 * (solid/dashed/dotted — это EdgeLinePattern):
 * - 'straight'   — один прямой отрезок между граничными точками;
 * - 'bezier'     — плавная кубическая кривая;
 * - 'smoothstep' — ортогональная ступень со СКРУГЛЁННЫМИ углами;
 * - 'step'       — та же ступень через середину, но с РЕЗКИМИ углами;
 * - 'orthogonal' — резкий dogleg с выходом перпендикулярно семантическим
 *   сторонам портов (короткий «носик» у каждого конца).
 */
export type EdgeGeometry = 'straight' | 'bezier' | 'smoothstep' | 'orthogonal' | 'step';
/** Значение EdgeStyle.routing: 'auto' = маршрут определяет активная раскладка. */
export type EdgeRoutingChoice = 'auto' | EdgeGeometry;

/** Радиус скругления углов ломаной (smoothstep и «аккуратные» маршруты раскладок). */
export const CORNER_RADIUS = 12;
/** Длина перпендикулярного «носика» у порта в ортогональном маршруте. */
export const PORT_STUB = 22;

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

/** Точка на середине выбранной стороны прямоугольника (детерминированный порт). */
export function sidePort(rect: Rect, side: PortSide): Port {
  const c = rectCenter(rect);
  switch (side) {
    case 'top':
      return { x: c.x, y: rect.y, side };
    case 'bottom':
      return { x: c.x, y: rect.y + rect.height, side };
    case 'left':
      return { x: rect.x, y: c.y, side };
    default:
      return { x: rect.x + rect.width, y: c.y, side };
  }
}

/**
 * Порты на обращённых друг к другу сторонах по доминирующей оси: право→лево
 * между колонками, низ→верх между уровнями. Годится там, где семантики
 * раскладки нет (step/smoothstep, generic orthogonal).
 */
export function facingPorts(sourceRect: Rect, targetRect: Rect): { source: Port; target: Port } {
  const sc = rectCenter(sourceRect);
  const tc = rectCenter(targetRect);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { source: sidePort(sourceRect, 'right'), target: sidePort(targetRect, 'left') }
      : { source: sidePort(sourceRect, 'left'), target: sidePort(targetRect, 'right') };
  }
  return dy >= 0
    ? { source: sidePort(sourceRect, 'bottom'), target: sidePort(targetRect, 'top') }
    : { source: sidePort(sourceRect, 'top'), target: sidePort(targetRect, 'bottom') };
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Порог «та же точка»: схлопывает вырожденные сегменты ломаной. */
const SAME_POINT = 0.01;

function dedupePoints(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (!last || Math.abs(last.x - p.x) > SAME_POINT || Math.abs(last.y - p.y) > SAME_POINT) {
      out.push(p);
    }
  }
  return out.length > 0 ? out : [points[0]];
}

/**
 * Ломаная в SVG-путь. radius > 0 — углы скругляются квадратичной дугой
 * (smoothstep), radius === 0 — резкие углы, путь состоит только из M/L.
 */
function polylinePath(points: Point[], radius: number): string {
  let d = `M ${r2(points[0].x)} ${r2(points[0].y)}`;
  if (points.length === 1) return d;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const v = points[i];
    const next = points[i + 1];
    const dIn = Math.hypot(v.x - prev.x, v.y - prev.y);
    const dOut = Math.hypot(next.x - v.x, next.y - v.y);
    const r = Math.min(radius, dIn / 2, dOut / 2);
    if (!(r > 0.5)) {
      d += ` L ${r2(v.x)} ${r2(v.y)}`;
      continue;
    }
    const ax = v.x + ((prev.x - v.x) / dIn) * r;
    const ay = v.y + ((prev.y - v.y) / dIn) * r;
    const bx = v.x + ((next.x - v.x) / dOut) * r;
    const by = v.y + ((next.y - v.y) / dOut) * r;
    d += ` L ${r2(ax)} ${r2(ay)} Q ${r2(v.x)} ${r2(v.y)}, ${r2(bx)} ${r2(by)}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${r2(last.x)} ${r2(last.y)}`;
}

/** Точка на половине длины ломаной — позиция подписи на видимой траектории. */
function polylineMidpoint(points: Point[]): Point {
  if (points.length === 1) return points[0];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(len);
    total += len;
  }
  if (total === 0) return points[0];
  const half = total / 2;
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const len = lengths[i - 1];
    if (acc + len >= half) {
      const t = len === 0 ? 0 : (half - acc) / len;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      };
    }
    acc += len;
  }
  return points[points.length - 1];
}

/**
 * Общий конструктор маршрута-ломаной: схлопывает вырожденные сегменты, строит
 * путь (со скруглением или без) и кладёт подпись на середину траектории.
 * `curve` не выдаётся — taper к ломаной неприменим (как и раньше у orthogonal).
 */
export function polylineRoute(
  rawPoints: Point[],
  source: Port,
  target: Port,
  radius: number,
): RoutedEdge {
  const points = dedupePoints(rawPoints);
  const mid = polylineMidpoint(points);
  return { path: polylinePath(points, radius), labelX: mid.x, labelY: mid.y, source, target };
}

/** Ступень через середину между портами: H-V-H или V-H-V по доминирующей оси. */
export function stepPoints(sp: Point, tp: Point): Point[] {
  if (Math.abs(tp.x - sp.x) >= Math.abs(tp.y - sp.y)) {
    const mx = (sp.x + tp.x) / 2;
    return [sp, { x: mx, y: sp.y }, { x: mx, y: tp.y }, tp];
  }
  const my = (sp.y + tp.y) / 2;
  return [sp, { x: sp.x, y: my }, { x: tp.x, y: my }, tp];
}

/**
 * Ортогональный dogleg: из каждого порта выходим перпендикулярно ЕГО стороне на
 * PORT_STUB, между «носиками» — Z по доминирующей оси выхода. Все сегменты
 * строго H/V, углы резкие.
 */
export function orthogonalPoints(sp: Port, tp: Port, stub = PORT_STUB): Point[] {
  const sn = SIDE_NORMALS[sp.side];
  const tn = SIDE_NORMALS[tp.side];
  const a: Point = { x: sp.x + sn.x * stub, y: sp.y + sn.y * stub };
  const b: Point = { x: tp.x + tn.x * stub, y: tp.y + tn.y * stub };
  const horizontalExit = sp.side === 'left' || sp.side === 'right';
  const mid: Point[] = horizontalExit
    ? [
        { x: (a.x + b.x) / 2, y: a.y },
        { x: (a.x + b.x) / 2, y: b.y },
      ]
    : [
        { x: a.x, y: (a.y + b.y) / 2 },
        { x: b.x, y: (a.y + b.y) / 2 },
      ];
  return [sp, a, ...mid, b, tp];
}

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

/** straight-diagonal: прямая между двумя портами. */
export function straightFromPorts(sp: Port, tp: Port): RoutedEdge {
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

/** straight-diagonal (fishbone): прямая под углом ветви, порт на рамке. */
function routeStraight(sourceRect: Rect, targetRect: Rect): RoutedEdge {
  const sp = portToward(sourceRect, rectCenter(targetRect));
  const tp = portToward(targetRect, rectCenter(sourceRect));
  return straightFromPorts(sp, tp);
}

/**
 * orthogonal: только H/V сегменты, углы 90°. Порты на обращённых друг к другу
 * сторонах по доминирующей оси; подпись — на середине среднего сегмента.
 */
function routeOrthogonal(sourceRect: Rect, targetRect: Rect): RoutedEdge {
  const { source, target } = facingPorts(sourceRect, targetRect);
  return polylineRoute(stepPoints(source, target), source, target, 0);
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

/**
 * Маршрут по ЯВНО выбранной пользователем геометрии между заданными портами.
 * Используется там, где границы уже определены (fixed-хэндлы free-раскладки).
 */
export function routeBetweenPorts(sp: Port, tp: Port, geometry: EdgeGeometry): RoutedEdge {
  switch (geometry) {
    case 'straight':
      return straightFromPorts(sp, tp);
    case 'bezier':
      return bezierFromPorts(sp, tp);
    case 'smoothstep':
      return polylineRoute(stepPoints(sp, tp), sp, tp, CORNER_RADIUS);
    case 'step':
      return polylineRoute(stepPoints(sp, tp), sp, tp, 0);
    case 'orthogonal':
      return polylineRoute(orthogonalPoints(sp, tp), sp, tp, 0);
  }
}

/**
 * Маршрут по явно выбранной геометрии между двумя прямоугольниками: порты
 * подбираются под геометрию — «смотрящие» точки на рамке для кривых/прямых и
 * центры обращённых сторон для ступенчатых/ортогональных маршрутов.
 */
export function routeUserGeometry(
  sourceRect: Rect,
  targetRect: Rect,
  geometry: EdgeGeometry,
): RoutedEdge {
  if (geometry === 'straight' || geometry === 'bezier') {
    const sp = portToward(sourceRect, rectCenter(targetRect));
    const tp = portToward(targetRect, rectCenter(sourceRect));
    return routeBetweenPorts(sp, tp, geometry);
  }
  const { source, target } = facingPorts(sourceRect, targetRect);
  return routeBetweenPorts(source, target, geometry);
}
