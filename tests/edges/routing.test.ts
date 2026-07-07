import { describe, it, expect } from 'vitest';
import {
  portToward,
  routeEdge,
  rectCenter,
  bezierOffset,
  BEZIER_OFFSET_MAX,
  BEZIER_OFFSET_MIN,
  type Rect,
  type Point,
} from '../../src/features/edges/lib/routing';

const rect = (x: number, y: number, width = 180, height = 48): Rect => ({ x, y, width, height });

const EPS = 1e-6;

/** Точка лежит РОВНО на границе прямоугольника (на одной из четырёх сторон). */
function onBoundary(r: Rect, p: Point): boolean {
  const withinX = p.x >= r.x - EPS && p.x <= r.x + r.width + EPS;
  const withinY = p.y >= r.y - EPS && p.y <= r.y + r.height + EPS;
  const onVertical = (Math.abs(p.x - r.x) < EPS || Math.abs(p.x - (r.x + r.width)) < EPS) && withinY;
  const onHorizontal = (Math.abs(p.y - r.y) < EPS || Math.abs(p.y - (r.y + r.height)) < EPS) && withinX;
  return onVertical || onHorizontal;
}

/** Расстояние от точки до рамки прямоугольника (0 — точка на рамке). */
function distToBoundary(r: Rect, p: Point): number {
  const dLeft = Math.abs(p.x - r.x);
  const dRight = Math.abs(p.x - (r.x + r.width));
  const dTop = Math.abs(p.y - r.y);
  const dBottom = Math.abs(p.y - (r.y + r.height));
  const withinX = p.x >= r.x && p.x <= r.x + r.width;
  const withinY = p.y >= r.y && p.y <= r.y + r.height;
  const candidates: number[] = [];
  if (withinY) candidates.push(dLeft, dRight);
  if (withinX) candidates.push(dTop, dBottom);
  if (candidates.length === 0) {
    // Точка «по диагонали» от прямоугольника — расстояние до ближайшего угла.
    const cx = Math.min(dLeft, dRight);
    const cy = Math.min(dTop, dBottom);
    candidates.push(Math.hypot(cx, cy));
  }
  return Math.min(...candidates);
}

/** Все координатные пары из SVG-пути (M/L/C). */
function pathPoints(path: string): Point[] {
  const nums = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const pts: Point[] = [];
  for (let i = 0; i < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

describe('portToward — динамический выбор порта (ядро фикса)', () => {
  const r = rect(0, 0, 180, 48); // центр (90, 24)

  it('порт лежит на границе ноды, не внутри и не в центре', () => {
    const targets: Point[] = [
      { x: 500, y: 24 }, // строго справа
      { x: -300, y: 24 }, // слева
      { x: 90, y: 400 }, // снизу
      { x: 90, y: -400 }, // сверху
      { x: 400, y: 300 }, // диагональ
      { x: -50, y: -333 }, // диагональ
    ];
    const c = rectCenter(r);
    for (const t of targets) {
      const p = portToward(r, t);
      expect(onBoundary(r, p)).toBe(true);
      expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeGreaterThan(1);
    }
  });

  it('порт обращён к другому концу: сторона совпадает с направлением', () => {
    expect(portToward(r, { x: 999, y: 24 }).side).toBe('right');
    expect(portToward(r, { x: -999, y: 24 }).side).toBe('left');
    expect(portToward(r, { x: 90, y: 999 }).side).toBe('bottom');
    expect(portToward(r, { x: 90, y: -999 }).side).toBe('top');
  });

  it('точка на диагональной грани: и x, и y между углами (втыкание не под фикс. стороной)', () => {
    const p = portToward(r, { x: 300, y: 200 });
    // Луч уходит вправо-вниз: порт на нижней или правой грани, со смещением.
    expect(onBoundary(r, p)).toBe(true);
    expect(p.x).toBeGreaterThan(90); // сдвинут к правой части
    expect(p.y).toBeGreaterThan(24); // и к нижней
  });
});

describe('стрелки от границы: конец пути касается рамки целевой ноды', () => {
  const src = rect(0, 0);
  const dst = rect(500, 300);

  for (const routing of ['bezier', 'radial', 'straight', 'orthogonal'] as const) {
    it(`${routing}: расстояние от кончика до рамки ≈ 0, начало — на рамке source`, () => {
      const routed = routeEdge(src, dst, routing);
      expect(distToBoundary(dst, routed.target)).toBeLessThan(EPS);
      expect(distToBoundary(src, routed.source)).toBeLessThan(EPS);
      // Путь начинается и заканчивается ровно в портах (стрелка не висит в стороне).
      const pts = pathPoints(routed.path);
      expect(pts[0].x).toBeCloseTo(routed.source.x, 1);
      expect(pts[0].y).toBeCloseTo(routed.source.y, 1);
      expect(pts.at(-1)!.x).toBeCloseTo(routed.target.x, 1);
      expect(pts.at(-1)!.y).toBeCloseTo(routed.target.y, 1);
    });
  }
});

describe('orthogonal: только H/V сегменты', () => {
  it('горизонтальная доминанта: право→лево, все сегменты строго H или V', () => {
    const routed = routeEdge(rect(0, 0), rect(600, 120), 'orthogonal');
    expect(routed.source.side).toBe('right');
    expect(routed.target.side).toBe('left');
    const pts = pathPoints(routed.path);
    for (let i = 1; i < pts.length; i++) {
      const horizontal = Math.abs(pts[i].y - pts[i - 1].y) < EPS;
      const vertical = Math.abs(pts[i].x - pts[i - 1].x) < EPS;
      expect(horizontal || vertical).toBe(true);
    }
  });

  it('вертикальная доминанта: низ→верх между уровнями', () => {
    const routed = routeEdge(rect(0, 0), rect(40, 400), 'orthogonal');
    expect(routed.source.side).toBe('bottom');
    expect(routed.target.side).toBe('top');
    const pts = pathPoints(routed.path);
    for (let i = 1; i < pts.length; i++) {
      const horizontal = Math.abs(pts[i].y - pts[i - 1].y) < EPS;
      const vertical = Math.abs(pts[i].x - pts[i - 1].x) < EPS;
      expect(horizontal || vertical).toBe(true);
    }
  });
});

describe('radial: вектор порта направлен к центру раскладки', () => {
  it('порт спутника смотрит на центральную ноду (угол в пределах допуска)', () => {
    // Центр раскладки в (0,0): центральная нода вокруг него, спутник справа.
    const hub = rect(-90, -24, 180, 48);
    const satellite = rect(310, -24, 180, 48);
    const routed = routeEdge(hub, satellite, 'radial');

    // Вектор из центра спутника к его порту должен указывать на центр (0,0).
    const sc = rectCenter(satellite);
    const toPort = { x: routed.target.x - sc.x, y: routed.target.y - sc.y };
    const toCenter = { x: 0 - sc.x, y: 0 - sc.y };
    const dot =
      (toPort.x * toCenter.x + toPort.y * toCenter.y) /
      (Math.hypot(toPort.x, toPort.y) * Math.hypot(toCenter.x, toCenter.y));
    expect(dot).toBeGreaterThan(0.99); // почти коллинеарны

    // И порт центральной ноды — со стороны спутника.
    expect(routed.source.side).toBe('right');
  });

  it('диагональный спутник: порты на линии центр-центр, не на фиксированной стороне', () => {
    const hub = rect(-90, -24, 180, 48);
    const satellite = rect(200, 260, 180, 48);
    const routed = routeEdge(hub, satellite, 'radial');
    const hc = rectCenter(hub);
    const sc = rectCenter(satellite);
    // Порт хаба лежит в направлении спутника (вниз-вправо), а не строго справа.
    expect(routed.source.x).toBeGreaterThan(hc.x);
    expect(routed.source.y).toBeGreaterThan(hc.y);
    expect(routed.target.x).toBeLessThan(sc.x);
    expect(routed.target.y).toBeLessThan(sc.y);
  });
});

describe('кривизна по расстоянию, не константа', () => {
  it('offset = clamp(distance * k, min, max)', () => {
    expect(bezierOffset(0)).toBe(BEZIER_OFFSET_MIN);
    expect(bezierOffset(200)).toBe(60); // 200 * 0.3
    expect(bezierOffset(1e6)).toBe(BEZIER_OFFSET_MAX);
  });

  it('на большом расстоянии контрольные точки не дальше max от порта (нет гигантских дуг)', () => {
    const routed = routeEdge(rect(0, 0), rect(5000, 3000), 'bezier');
    const { source, target, curve } = routed;
    expect(curve).toBeDefined();
    const d1 = Math.hypot(curve!.c1x - source.x, curve!.c1y - source.y);
    const d2 = Math.hypot(curve!.c2x - target.x, curve!.c2y - target.y);
    expect(d1).toBeLessThanOrEqual(BEZIER_OFFSET_MAX + EPS);
    expect(d2).toBeLessThanOrEqual(BEZIER_OFFSET_MAX + EPS);
  });

  it('на малом расстоянии кривизна не меньше min (кривая не вырождается в излом)', () => {
    const routed = routeEdge(rect(0, 0), rect(220, 0), 'bezier');
    const d1 = Math.hypot(routed.curve!.c1x - routed.source.x, routed.curve!.c1y - routed.source.y);
    expect(d1).toBeGreaterThanOrEqual(BEZIER_OFFSET_MIN - EPS);
  });
});

describe('подпись — на видимой траектории, а не на отрезке центр-центр', () => {
  it('label между рамками нод, не внутри ноды', () => {
    const src = rect(0, 0);
    const dst = rect(600, 0);
    for (const routing of ['bezier', 'straight', 'orthogonal', 'radial'] as const) {
      const routed = routeEdge(src, dst, routing);
      // Между правой гранью source (180) и левой гранью target (600).
      expect(routed.labelX).toBeGreaterThan(src.x + src.width);
      expect(routed.labelX).toBeLessThan(dst.x);
    }
  });

  it('соседние ноды: label не попадает в геометрический центр отрезка центр-центр, если тот внутри ноды', () => {
    // Большая source-нода и цель вплотную справа: середина центр-центр лежит
    // ВНУТРИ source — с портов на рамке label выходит за её пределы.
    const src = rect(0, 0, 400, 48);
    const dst = rect(420, 0, 180, 48);
    const routed = routeEdge(src, dst, 'bezier');
    expect(routed.labelX).toBeGreaterThan(src.x + src.width - EPS);
  });
});
