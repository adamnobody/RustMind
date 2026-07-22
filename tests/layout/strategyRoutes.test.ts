import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge } from '../../src/store/types';
import { DEFAULT_NODE_SIZE, ROOT_NODE_SIZE } from '../../src/shared/lib/constants';
import { getLayoutStrategy } from '../../src/features/layout/strategies/registry';
import { ribAnchorX } from '../../src/features/layout/strategies/fishbone';
import type { LayoutKind } from '../../src/features/layout/engines/layoutTypes';
import type { RoutedEdge, Rect, Point } from '../../src/features/edges/lib/routing';

/** Позиция узла — левый верхний угол; размер берётся из констант приложения. */
function rectOfNode(node: AppNode): Rect {
  const size = node.data.isRoot === true ? ROOT_NODE_SIZE : DEFAULT_NODE_SIZE;
  return { x: node.position.x, y: node.position.y, width: size.width, height: size.height };
}

function node(id: string, order = 0, isRoot = false): AppNode {
  return { id, type: 'mindNode', position: { x: 0, y: 0 }, data: { label: id, order, isRoot } };
}

function edge(source: string, target: string): AppEdge {
  return { id: `${source}-${target}`, source, target, data: { kind: 'tree' } };
}

interface Graph {
  nodes: AppNode[];
  edges: AppEdge[];
}

/** Корень с тремя ветвями, у двух — по потомку. */
function branchy(): Graph {
  return {
    nodes: [node('R', 0, true), node('A', 0), node('B', 1), node('C', 2), node('A1'), node('B1')],
    edges: [edge('R', 'A'), edge('R', 'B'), edge('R', 'C'), edge('A', 'A1'), edge('B', 'B1')],
  };
}

/** Прогоняет граф через раскладку и возвращает позиции + маршруты её рёбер. */
function laidOut(kind: LayoutKind, graph: Graph): {
  rects: Map<string, Rect>;
  routeOf: (source: string, target: string) => RoutedEdge;
  nodes: AppNode[];
} {
  const strategy = getLayoutStrategy(kind);
  const nodes = strategy.layout(graph.nodes, graph.edges);
  const rects = new Map(nodes.map((n) => [n.id, rectOfNode(n)]));
  const routeOf = (source: string, target: string): RoutedEdge => {
    const routed = strategy.routeTreeEdge?.({
      sourceId: source,
      targetId: target,
      sourceRect: rects.get(source)!,
      targetRect: rects.get(target)!,
      rectOf: (id) => rects.get(id),
      nodes,
      edges: graph.edges,
    });
    if (!routed) throw new Error(`${kind}: нет маршрута ${source}→${target}`);
    return routed;
  };
  return { rects, routeOf, nodes };
}

function pathPoints(path: string): Point[] {
  const nums = path.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const pts: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: Number(nums[i]), y: Number(nums[i + 1]) });
  return pts;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('hierarchy / right / left: детерминированные порты', () => {
  it('hierarchy: низ родителя → верх ребёнка, маршрут сразу идёт вниз', () => {
    const { routeOf } = laidOut('hierarchy', branchy());
    for (const [s, t] of [['R', 'A'], ['R', 'B'], ['A', 'A1']] as const) {
      const routed = routeOf(s, t);
      expect(routed.source.side).toBe('bottom');
      expect(routed.target.side).toBe('top');
      const pts = pathPoints(routed.path);
      expect(pts[1].y).toBeGreaterThan(pts[0].y); // не вбок и не вверх
      expect(routed.target.y).toBeGreaterThan(routed.source.y);
    }
  });

  it('right: правая грань → левая грань, первый сегмент идёт вправо', () => {
    const { routeOf } = laidOut('right', branchy());
    for (const [s, t] of [['R', 'A'], ['A', 'A1']] as const) {
      const routed = routeOf(s, t);
      expect(routed.source.side).toBe('right');
      expect(routed.target.side).toBe('left');
      expect(pathPoints(routed.path)[1].x).toBeGreaterThan(routed.source.x);
    }
  });

  it('left: левая грань → правая грань, первый сегмент идёт влево', () => {
    const { routeOf } = laidOut('left', branchy());
    for (const [s, t] of [['R', 'A'], ['A', 'A1']] as const) {
      const routed = routeOf(s, t);
      expect(routed.source.side).toBe('left');
      expect(routed.target.side).toBe('right');
      expect(pathPoints(routed.path)[1].x).toBeLessThan(routed.source.x);
    }
  });
});

describe('org: общая горизонтальная шина сиблингов', () => {
  const graph = branchy();

  it('все дети одного родителя используют одну Y шины', () => {
    const { routeOf } = laidOut('org', graph);
    const busY = (['A', 'B', 'C'] as const).map((child) => {
      const pts = pathPoints(routeOf('R', child).path);
      return pts[1].y; // первый излом — на шине
    });
    expect(new Set(busY.map((y) => Math.round(y * 100)))).toHaveLength(1);
  });

  it('маршрут начинается снизу родителя и заканчивается сверху ребёнка', () => {
    const { routeOf } = laidOut('org', graph);
    for (const child of ['A', 'B', 'C'] as const) {
      const routed = routeOf('R', child);
      expect(routed.source.side).toBe('bottom');
      expect(routed.target.side).toBe('top');
    }
  });

  it('шина лежит между нижней гранью родителя и верхом детей', () => {
    const { rects, routeOf } = laidOut('org', graph);
    const parent = rects.get('R')!;
    const busY = pathPoints(routeOf('R', 'A').path)[1].y;
    expect(busY).toBeGreaterThan(parent.y + parent.height);
    for (const child of ['A', 'B', 'C'] as const) {
      expect(busY).toBeLessThan(rects.get(child)!.y);
    }
  });

  it('крайние левый и правый дети не заставляют ребро выходить из боков родителя', () => {
    const { rects, routeOf } = laidOut('org', graph);
    const centerX = rects.get('R')!.x + rects.get('R')!.width / 2;
    const byX = (['A', 'B', 'C'] as const).slice().sort((a, b) => rects.get(a)!.x - rects.get(b)!.x);
    for (const child of [byX[0], byX.at(-1)!]) {
      const routed = routeOf('R', child);
      expect(routed.source.side).toBe('bottom');
      expect(routed.source.x).toBeCloseTo(centerX, 6);
    }
  });
});

describe('timeline: настоящая временная ось', () => {
  const graph = branchy();

  it('события первого уровня монотонно упорядочены по X согласно order', () => {
    const { rects } = laidOut('timeline', graph);
    const xs = ['A', 'B', 'C'].map((id) => rects.get(id)!.x);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
  });

  it('начало (корень) — левее всех событий', () => {
    const { rects } = laidOut('timeline', graph);
    for (const id of ['A', 'B', 'C']) {
      expect(rects.get('R')!.x).toBeLessThan(rects.get(id)!.x);
    }
  });

  it('события чередуются выше и ниже оси, все — на одном выносе', () => {
    const { rects } = laidOut('timeline', graph);
    const axis = rects.get('R')!.y + rects.get('R')!.height / 2;
    const offsets = ['A', 'B', 'C'].map((id) => {
      const r = rects.get(id)!;
      return r.y + r.height / 2 - axis;
    });
    expect(Math.sign(offsets[0])).toBe(-1);
    expect(Math.sign(offsets[1])).toBe(1);
    expect(Math.sign(offsets[2])).toBe(-1);
    // Единая ось: одинаковый модуль выноса у всех событий.
    expect(new Set(offsets.map((o) => Math.round(Math.abs(o))))).toHaveLength(1);
  });

  it('маршрут события идёт по оси и втыкается вертикальным сегментом', () => {
    const { rects, routeOf } = laidOut('timeline', graph);
    const axis = rects.get('R')!.y + rects.get('R')!.height / 2;
    const routed = routeOf('R', 'A');
    expect(routed.source.side).toBe('right');
    expect(routed.target.side).toBe('bottom'); // A над осью — вход снизу
    const pts = pathPoints(routed.path);
    expect(pts[0].y).toBeCloseTo(axis, 6); // старт лежит на оси
    const last = pts.at(-1)!;
    const prev = pts.at(-2)!;
    expect(prev.x).toBeCloseTo(last.x, 6); // последний сегмент строго вертикальный
  });

  it('потомки остаются на стороне своего события', () => {
    const { rects } = laidOut('timeline', graph);
    const axis = rects.get('R')!.y + rects.get('R')!.height / 2;
    const sideOf = (id: string): number => Math.sign(rects.get(id)!.y + rects.get(id)!.height / 2 - axis);
    expect(sideOf('A1')).toBe(sideOf('A'));
    expect(sideOf('B1')).toBe(sideOf('B'));
  });

  it('результат не эквивалентен org и hierarchy', () => {
    const timeline = laidOut('timeline', graph).rects;
    for (const other of ['org', 'hierarchy'] as const) {
      const rects = laidOut(other, graph).rects;
      const same = ['A', 'B', 'C'].every(
        (id) => rects.get(id)!.x === timeline.get(id)!.x && rects.get(id)!.y === timeline.get(id)!.y,
      );
      expect(same).toBe(false);
    }
    // В org дети одного уровня лежат на одном Y — в таймлайне заведомо нет.
    const ys = ['A', 'B', 'C'].map((id) => timeline.get(id)!.y);
    expect(new Set(ys).size).toBeGreaterThan(1);
  });

  it('поддеревья не накладываются на типовом дереве', () => {
    const { rects } = laidOut('timeline', branchy());
    const all = [...rects.values()];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(overlaps(all[i], all[j])).toBe(false);
      }
    }
  });
});

describe('fishbone: голова, хребет и кости', () => {
  const graph = branchy();

  it('корень — самый правый структурный узел, категории слева', () => {
    const { rects } = laidOut('fishbone', graph);
    const rootRight = rects.get('R')!.x + rects.get('R')!.width;
    for (const id of ['A', 'B', 'C', 'A1', 'B1']) {
      expect(rects.get(id)!.x + rects.get(id)!.width).toBeLessThan(rootRight);
      expect(rects.get(id)!.x).toBeLessThan(rects.get('R')!.x);
    }
  });

  it('категории чередуются сверху и снизу от хребта', () => {
    const { rects } = laidOut('fishbone', graph);
    const spine = rects.get('R')!.y + rects.get('R')!.height / 2;
    const sides = ['A', 'B', 'C'].map((id) =>
      Math.sign(rects.get(id)!.y + rects.get(id)!.height / 2 - spine),
    );
    expect(sides[0]).toBe(-1);
    expect(sides[1]).toBe(1);
    expect(sides[2]).toBe(-1);
  });

  it('хребет горизонтален: первый сегмент маршрута категории лежит на линии корня', () => {
    const { rects, routeOf } = laidOut('fishbone', graph);
    const spine = rects.get('R')!.y + rects.get('R')!.height / 2;
    for (const id of ['A', 'B', 'C'] as const) {
      const pts = pathPoints(routeOf('R', id).path);
      expect(pts[0].y).toBeCloseTo(spine, 6);
      expect(pts[1].y).toBeCloseTo(spine, 6); // сегмент хребта строго горизонтален
      expect(pts[1].x).toBeLessThan(pts[0].x); // и уходит влево от головы
    }
  });

  it('точки крепления категорий различаются и упорядочены вдоль хребта', () => {
    const { rects } = laidOut('fishbone', graph);
    const anchors = ['A', 'B', 'C'].map((id) => ribAnchorX(rects.get(id)!));
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(anchors[0]).toBeGreaterThan(anchors[1]);
    expect(anchors[1]).toBeGreaterThan(anchors[2]);
  });

  it('кость соединяет крепление на хребте с категорией', () => {
    const { rects, routeOf } = laidOut('fishbone', graph);
    const routed = routeOf('R', 'A');
    const pts = pathPoints(routed.path);
    expect(pts).toHaveLength(3); // голова → крепление → категория
    expect(pts.at(-1)!.x).toBeCloseTo(routed.target.x, 6);
    expect(routed.target.side).toBe('bottom'); // A над хребтом
  });

  it('под-причины принадлежат кости своей категории и не идут generic-безье', () => {
    const { rects, routeOf } = laidOut('fishbone', graph);
    const spine = rects.get('R')!.y + rects.get('R')!.height / 2;
    const sideOf = (id: string): number => Math.sign(rects.get(id)!.y + rects.get(id)!.height / 2 - spine);
    expect(sideOf('A1')).toBe(sideOf('A'));
    const routed = routeOf('A', 'A1');
    expect(routed.source.side).toBe('left');
    expect(routed.target.side).toBe('right');
    expect(routed.path).not.toContain('C');
  });

  it('результат не эквивалентен left-раскладке', () => {
    const fish = laidOut('fishbone', graph).rects;
    const left = laidOut('left', graph).rects;
    const same = ['A', 'B', 'C'].every(
      (id) => fish.get(id)!.x === left.get(id)!.x && fish.get(id)!.y === left.get(id)!.y,
    );
    expect(same).toBe(false);
  });
});

describe('logic: компактный вложенный аутлайн', () => {
  const graph = branchy();

  it('X растёт с глубиной, Y — с порядком документа', () => {
    const { rects } = laidOut('logic', graph);
    expect(rects.get('A')!.x).toBeGreaterThan(rects.get('R')!.x);
    expect(rects.get('A1')!.x).toBeGreaterThan(rects.get('A')!.x);
    // Pre-order: R, A, A1, B, B1, C.
    const order = ['R', 'A', 'A1', 'B', 'B1', 'C'].map((id) => rects.get(id)!.y);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
  });

  it('вертикальные диапазоны поддеревьев сиблингов не пересекаются', () => {
    const { rects } = laidOut('logic', graph);
    const span = (ids: string[]): [number, number] => [
      Math.min(...ids.map((id) => rects.get(id)!.y)),
      Math.max(...ids.map((id) => rects.get(id)!.y + rects.get(id)!.height)),
    ];
    const spans = [span(['A', 'A1']), span(['B', 'B1']), span(['C'])];
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i][0]).toBeGreaterThanOrEqual(spans[i - 1][1]);
    }
  });

  it('маршруты используют локальную вертикальную шину: один X для всех детей', () => {
    const { rects, routeOf } = laidOut('logic', graph);
    const busX = (['A', 'B', 'C'] as const).map((id) => pathPoints(routeOf('R', id).path)[1].x);
    expect(new Set(busX.map((x) => Math.round(x * 100)))).toHaveLength(1);
    const parentRight = rects.get('R')!.x + rects.get('R')!.width;
    expect(busX[0]).toBeGreaterThan(parentRight);
    // Только H/V сегменты, резкие углы.
    const path = routeOf('R', 'A').path;
    expect(path).not.toMatch(/[CQ]/);
    const pts = pathPoints(path);
    for (let i = 1; i < pts.length; i++) {
      const h = Math.abs(pts[i].y - pts[i - 1].y) < 0.02;
      const v = Math.abs(pts[i].x - pts[i - 1].x) < 0.02;
      expect(h || v).toBe(true);
    }
  });

  it('координаты заметно отличаются от right', () => {
    const logic = laidOut('logic', graph).rects;
    const right = laidOut('right', graph).rects;
    const same = ['A', 'B', 'C', 'A1', 'B1'].every(
      (id) => logic.get(id)!.x === right.get(id)!.x && logic.get(id)!.y === right.get(id)!.y,
    );
    expect(same).toBe(false);
    // right центрирует родителя между детьми, logic ставит его в начало ветки.
    expect(right.get('R')!.y).toBeGreaterThan(logic.get('R')!.y - 1e-9);
    expect(logic.get('R')!.y).toBeLessThan(logic.get('A')!.y);
  });

  it('поддеревья не накладываются', () => {
    const { rects } = laidOut('logic', branchy());
    const all = [...rects.values()];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(overlaps(all[i], all[j])).toBe(false);
      }
    }
  });
});

describe('маршруты раскладок численно устойчивы', () => {
  it('ни один семантический маршрут не даёт NaN/Infinity', () => {
    for (const kind of ['hierarchy', 'right', 'left', 'both', 'org', 'logic', 'timeline', 'fishbone'] as const) {
      const { routeOf } = laidOut(kind, branchy());
      for (const [s, t] of [['R', 'A'], ['R', 'B'], ['R', 'C'], ['A', 'A1'], ['B', 'B1']] as const) {
        const routed = routeOf(s, t);
        expect(routed.path).not.toMatch(/NaN|Infinity/);
        expect(Number.isFinite(routed.labelX)).toBe(true);
        expect(Number.isFinite(routed.labelY)).toBe(true);
      }
    }
  });
});
