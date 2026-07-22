import { describe, it, expect } from 'vitest';
import {
  facingPorts,
  routeBetweenPorts,
  routeUserGeometry,
  sidePort,
  type EdgeGeometry,
  type Point,
  type Rect,
} from '../../src/features/edges/lib/routing';

const rect = (x: number, y: number, width = 180, height = 48): Rect => ({ x, y, width, height });

const EPS = 1e-6;
const ALL: EdgeGeometry[] = ['straight', 'bezier', 'smoothstep', 'orthogonal', 'step'];

/** Все координатные пары из SVG-пути (M/L/Q/C). */
function pathPoints(path: string): Point[] {
  const nums = path.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const pts: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: Number(nums[i]), y: Number(nums[i + 1]) });
  return pts;
}

/** Все сегменты пути строго горизонтальны или вертикальны. */
function axisAligned(path: string): boolean {
  const pts = pathPoints(path);
  for (let i = 1; i < pts.length; i++) {
    const h = Math.abs(pts[i].y - pts[i - 1].y) < 0.02;
    const v = Math.abs(pts[i].x - pts[i - 1].x) < 0.02;
    if (!h && !v) return false;
  }
  return true;
}

describe('пользовательские типы геометрии связи', () => {
  const src = rect(0, 0);
  const dst = rect(520, 300);

  it('straight: ни одной команды кривой, один прямой отрезок', () => {
    const { path } = routeUserGeometry(src, dst, 'straight');
    expect(path).not.toMatch(/[CQAScqas]/);
    expect(pathPoints(path)).toHaveLength(2);
  });

  it('bezier: кубическая кривая', () => {
    const routed = routeUserGeometry(src, dst, 'bezier');
    expect(routed.path).toContain('C');
    expect(routed.curve).toBeDefined();
  });

  it('smoothstep: ортогональная ступень со скруглением (есть Q)', () => {
    const { path } = routeUserGeometry(src, dst, 'smoothstep');
    expect(path).toContain('Q');
    expect(path).not.toContain('C');
  });

  it('orthogonal: только горизонтальные/вертикальные сегменты и резкие углы', () => {
    const { path } = routeUserGeometry(src, dst, 'orthogonal');
    expect(path).not.toMatch(/[CQAScqas]/);
    expect(axisAligned(path)).toBe(true);
  });

  it('step: резкие углы, ортогонально, но геометрия отличается от smoothstep', () => {
    const step = routeUserGeometry(src, dst, 'step');
    const smooth = routeUserGeometry(src, dst, 'smoothstep');
    expect(step.path).not.toMatch(/[CQAScqas]/);
    expect(axisAligned(step.path)).toBe(true);
    expect(step.path).not.toBe(smooth.path);
  });

  it('orthogonal отличается от step: «носики» у портов вместо хода через середину', () => {
    const ortho = routeUserGeometry(src, dst, 'orthogonal');
    const step = routeUserGeometry(src, dst, 'step');
    expect(ortho.path).not.toBe(step.path);
    // У orthogonal первый излом — на расстоянии носика от порта вдоль стороны.
    const first = pathPoints(ortho.path)[1];
    expect(Math.abs(first.x - ortho.source.x)).toBeGreaterThan(1);
  });

  it('все варианты дают разные пути на одной паре нод', () => {
    const paths = ALL.map((g) => routeUserGeometry(src, dst, g).path);
    expect(new Set(paths).size).toBe(ALL.length);
  });
});

describe('порты и подпись', () => {
  const src = rect(0, 0);
  const dst = rect(600, 0);

  it('путь начинается и заканчивается ровно в портах, порты — на рамках', () => {
    for (const geometry of ALL) {
      const routed = routeUserGeometry(src, dst, geometry);
      const pts = pathPoints(routed.path);
      expect(pts[0].x).toBeCloseTo(routed.source.x, 1);
      expect(pts[0].y).toBeCloseTo(routed.source.y, 1);
      expect(pts.at(-1)!.x).toBeCloseTo(routed.target.x, 1);
      expect(pts.at(-1)!.y).toBeCloseTo(routed.target.y, 1);
    }
  });

  it('координаты подписи конечны и лежат рядом с серединой маршрута', () => {
    for (const geometry of ALL) {
      const routed = routeUserGeometry(src, dst, geometry);
      expect(Number.isFinite(routed.labelX)).toBe(true);
      expect(Number.isFinite(routed.labelY)).toBe(true);
      // Между правой гранью source (180) и левой гранью target (600).
      expect(routed.labelX).toBeGreaterThan(src.x + src.width - EPS);
      expect(routed.labelX).toBeLessThan(dst.x + EPS);
    }
  });
});

describe('вырожденные случаи не дают NaN/Infinity', () => {
  const degenerate: [string, Rect, Rect][] = [
    ['совпадающие прямоугольники', rect(0, 0), rect(0, 0)],
    ['нулевой размер', { x: 10, y: 10, width: 0, height: 0 }, { x: 10, y: 10, width: 0, height: 0 }],
    ['совпадающие центры, разный размер', rect(0, 0, 200, 60), rect(10, 6, 180, 48)],
    ['строго по вертикали', rect(0, 0), rect(0, 400)],
    ['строго по горизонтали', rect(0, 0), rect(400, 0)],
  ];

  for (const [name, a, b] of degenerate) {
    it(`${name}: путь и подпись конечны`, () => {
      for (const geometry of ALL) {
        const routed = routeUserGeometry(a, b, geometry);
        expect(routed.path).not.toMatch(/NaN|Infinity/);
        expect(Number.isFinite(routed.labelX)).toBe(true);
        expect(Number.isFinite(routed.labelY)).toBe(true);
        for (const p of pathPoints(routed.path)) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        }
      }
    });
  }

  it('совпадающие порты: путь схлопывается, координаты остаются конечными', () => {
    const p = sidePort(rect(0, 0), 'right');
    for (const geometry of ALL) {
      const routed = routeBetweenPorts(p, p, geometry);
      expect(routed.path).not.toMatch(/NaN|Infinity/);
      expect(Number.isFinite(routed.labelX)).toBe(true);
      expect(Number.isFinite(routed.labelY)).toBe(true);
      // Подпись остаётся в окрестности точки (маршрут не «улетает»).
      expect(Math.hypot(routed.labelX - p.x, routed.labelY - p.y)).toBeLessThan(50);
    }
    // Ломаные и прямая вырождаются ровно в точку (у bezier/orthogonal остаётся
    // выход по нормали порта — небольшой «пузырь», это корректно).
    for (const geometry of ['straight', 'step', 'smoothstep'] as const) {
      const routed = routeBetweenPorts(p, p, geometry);
      expect(routed.labelX).toBe(p.x);
      expect(routed.labelY).toBe(p.y);
    }
  });
});

describe('facingPorts / sidePort', () => {
  it('sidePort кладёт точку ровно на середину выбранной стороны', () => {
    const r = rect(10, 20, 200, 60);
    expect(sidePort(r, 'top')).toEqual({ x: 110, y: 20, side: 'top' });
    expect(sidePort(r, 'bottom')).toEqual({ x: 110, y: 80, side: 'bottom' });
    expect(sidePort(r, 'left')).toEqual({ x: 10, y: 50, side: 'left' });
    expect(sidePort(r, 'right')).toEqual({ x: 210, y: 50, side: 'right' });
  });

  it('facingPorts берёт обращённые стороны по доминирующей оси', () => {
    expect(facingPorts(rect(0, 0), rect(600, 20)).source.side).toBe('right');
    expect(facingPorts(rect(0, 0), rect(600, 20)).target.side).toBe('left');
    expect(facingPorts(rect(0, 0), rect(20, 600)).source.side).toBe('bottom');
    expect(facingPorts(rect(0, 0), rect(20, 600)).target.side).toBe('top');
  });
});
