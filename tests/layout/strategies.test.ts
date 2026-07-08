import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge } from '../../src/store/types';
import { LAYOUT_KINDS, coerceLayoutKind } from '../../src/features/layout/engines/layoutTypes';
import {
  LAYOUT_STRATEGIES,
  getLayoutStrategy,
  isEdgeValidForLayout,
} from '../../src/features/layout/strategies/registry';

function makeNode(id: string, isRoot = false, x = 0, y = 0): AppNode {
  return {
    id,
    type: 'mindNode',
    position: { x, y },
    data: { label: id, isRoot },
  };
}

function treeEdge(source: string, target: string): AppEdge {
  return { id: `t_${source}__${target}`, source, target, data: { kind: 'tree' } };
}

function freeEdge(source: string, target: string): AppEdge {
  return { id: `f_${source}__${target}`, source, target, data: { kind: 'free' } };
}

/** Root R → (A, B); A → C; свободная связь B→C; сирота O без связей. */
function sampleGraph(): { nodes: AppNode[]; edges: AppEdge[] } {
  return {
    nodes: [
      makeNode('R', true),
      makeNode('A', false, 200, -60),
      makeNode('B', false, 200, 60),
      makeNode('C', false, 400, -60),
      makeNode('O', false, -100, 300),
    ],
    edges: [treeEdge('R', 'A'), treeEdge('R', 'B'), treeEdge('A', 'C'), freeEdge('B', 'C')],
  };
}

describe('реестр стратегий', () => {
  it('каждый LayoutKind имеет стратегию с совпадающим kind', () => {
    for (const kind of LAYOUT_KINDS) {
      const strategy = getLayoutStrategy(kind);
      expect(strategy).toBeDefined();
      expect(strategy.kind).toBe(kind);
    }
    expect(Object.keys(LAYOUT_STRATEGIES)).toHaveLength(12);
  });

  it('каждая стратегия объявляет валидный edgeRouting', () => {
    const valid = ['orthogonal', 'bezier', 'radial', 'straight'];
    for (const kind of LAYOUT_KINDS) {
      expect(valid).toContain(getLayoutStrategy(kind).edgeRouting);
    }
    // Точечные декларации из спецификации.
    expect(getLayoutStrategy('fishbone').edgeRouting).toBe('straight');
    expect(getLayoutStrategy('tree').edgeRouting).toBe('radial');
    expect(getLayoutStrategy('bubble').edgeRouting).toBe('radial');
    expect(getLayoutStrategy('network').edgeRouting).toBe('radial');
    expect(getLayoutStrategy('hierarchy').edgeRouting).toBe('bezier');
    expect(getLayoutStrategy('right').edgeRouting).toBe('bezier');
    expect(getLayoutStrategy('left').edgeRouting).toBe('bezier');
    expect(getLayoutStrategy('both').edgeRouting).toBe('bezier');
    expect(getLayoutStrategy('logic').edgeRouting).toBe('bezier');
    expect(getLayoutStrategy('org').edgeRouting).toBe('orthogonal');
    expect(getLayoutStrategy('timeline').edgeRouting).toBe('orthogonal');
  });

  it('каждая стратегия объявляет positionMode: derived везде, кроме network и free (stored)', () => {
    for (const kind of LAYOUT_KINDS) {
      const expected = kind === 'network' || kind === 'free' ? 'stored' : 'derived';
      expect(getLayoutStrategy(kind).positionMode).toBe(expected);
    }
  });

  it('coerceLayoutKind: новые как есть, legacy и упразднённые мапятся, мусор → hierarchy', () => {
    expect(coerceLayoutKind('fishbone')).toBe('fishbone');
    expect(coerceLayoutKind('tree-LR')).toBe('hierarchy');
    expect(coerceLayoutKind('tree-TB')).toBe('hierarchy');
    expect(coerceLayoutKind('radial')).toBe('tree');
    expect(coerceLayoutKind('free')).toBe('free');
    expect(coerceLayoutKind('block')).toBe('hierarchy');
    expect(coerceLayoutKind('bridge')).toBe('hierarchy');
    expect(coerceLayoutKind('multiflow')).toBe('hierarchy');
    expect(coerceLayoutKind('dialogue')).toBe('hierarchy');
    expect(coerceLayoutKind('flowchart')).toBe('hierarchy');
    expect(coerceLayoutKind('whatever')).toBe('hierarchy');
  });
});

describe('smoke каждой раскладки: все ноды получают конечную позицию', () => {
  for (const kind of LAYOUT_KINDS) {
    it(`${kind}: длина сохраняется, координаты конечны (нет NaN)`, () => {
      const { nodes, edges } = sampleGraph();
      const out = getLayoutStrategy(kind).layout(nodes, edges);
      expect(out).toHaveLength(nodes.length);
      for (const node of out) {
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
      }
    });

    it(`${kind}: пустой вход и одиночный корень безопасны`, () => {
      const strategy = getLayoutStrategy(kind);
      expect(strategy.layout([], [])).toHaveLength(0);
      const single = strategy.layout([makeNode('R', true)], []);
      expect(single).toHaveLength(1);
      expect(Number.isFinite(single[0].position.x)).toBe(true);
      expect(Number.isFinite(single[0].position.y)).toBe(true);
    });
  }

  it('layout не мутирует входные узлы', () => {
    const { nodes, edges } = sampleGraph();
    const snapshot = JSON.stringify(nodes);
    for (const kind of LAYOUT_KINDS) {
      getLayoutStrategy(kind).layout(nodes, edges);
    }
    expect(JSON.stringify(nodes)).toBe(snapshot);
  });
});

describe('canConnect по типам', () => {
  it('network не блокирует ничего (включая второй «родитель» и обратные связи)', () => {
    const { nodes, edges } = sampleGraph();
    const ctx = { nodes, edges };
    const s = getLayoutStrategy('network');
    expect(s.edgeConstraint).toBe('any');
    expect(s.canConnect('A', 'B', ctx)).toBe(true);
    expect(s.canConnect('B', 'A', ctx)).toBe(true);
    expect(s.canConnect('C', 'R', ctx)).toBe(true); // цикл — разрешён
    expect(s.canConnect('R', 'C', ctx)).toBe(true); // второй родитель — разрешён
  });

  it('free не блокирует ничего (полная свобода связей)', () => {
    const { nodes, edges } = sampleGraph();
    const ctx = { nodes, edges };
    const s = getLayoutStrategy('free');
    expect(s.edgeConstraint).toBe('any');
    expect(s.positionMode).toBe('stored');
    expect(s.canConnect('A', 'B', ctx)).toBe(true);
    expect(s.canConnect('B', 'A', ctx)).toBe(true);
    expect(s.canConnect('C', 'R', ctx)).toBe(true);
    expect(s.canConnect('R', 'C', ctx)).toBe(true);
  });

  for (const kind of [
    'hierarchy',
    'tree',
    'fishbone',
    'right',
    'left',
    'both',
    'org',
    'logic',
    'timeline',
  ] as const) {
    it(`${kind}: parent→child проходит, второй родитель/цикл/корень-цель — нет`, () => {
      const { nodes, edges } = sampleGraph();
      const ctx = { nodes, edges };
      const s = getLayoutStrategy(kind);
      // Новый узел (неизвестный id) — валидный лист.
      expect(s.canConnect('A', 'new-node', ctx)).toBe(true);
      // Сирота O без родителя — валидная цель.
      expect(s.canConnect('B', 'O', ctx)).toBe(true);
      // У C уже есть родитель (A) — второй запрещён.
      expect(s.canConnect('B', 'C', ctx)).toBe(false);
      // Корень не может стать потомком.
      expect(s.canConnect('A', 'R', ctx)).toBe(false);
      // Самоссылка запрещена.
      expect(s.canConnect('A', 'A', ctx)).toBe(false);
    });

    it(`${kind}: замыкание цикла через сироту блокируется`, () => {
      // Цепочка сирот X→Y (не связана с корнем): Y→X замкнула бы цикл.
      const nodes = [makeNode('R', true), makeNode('X'), makeNode('Y')];
      const edges = [treeEdge('X', 'Y')];
      expect(getLayoutStrategy(kind).canConnect('Y', 'X', { nodes, edges })).toBe(false);
    });
  }

  it('bubble: только центр↔пузырь', () => {
    const { nodes, edges } = sampleGraph();
    const ctx = { nodes, edges };
    const s = getLayoutStrategy('bubble');
    expect(s.canConnect('R', 'new-bubble', ctx)).toBe(true);
    expect(s.canConnect('O', 'R', ctx)).toBe(true);
    expect(s.canConnect('A', 'B', ctx)).toBe(false); // пузырь↔пузырь
    expect(s.canConnect('R', 'R', ctx)).toBe(false);
  });
});

describe('isEdgeValidForLayout (мягкая пометка существующих рёбер)', () => {
  it('существующие tree-рёбра валидны в hierarchy (само ребро исключается из контекста)', () => {
    const { nodes, edges } = sampleGraph();
    const s = getLayoutStrategy('hierarchy');
    for (const e of edges.filter((x) => x.data?.kind === 'tree')) {
      expect(isEdgeValidForLayout(s, e, nodes, edges)).toBe(true);
    }
  });

  it('free-связь, дающая второй «вход» в узел, помечается невалидной в hierarchy', () => {
    const { nodes, edges } = sampleGraph();
    const s = getLayoutStrategy('hierarchy');
    const assoc = edges.find((e) => e.data?.kind === 'free')!; // B→C, у C родитель A
    expect(isEdgeValidForLayout(s, assoc, nodes, edges)).toBe(false);
  });

  it("в network (edgeConstraint 'any') невалидных рёбер не бывает", () => {
    const { nodes, edges } = sampleGraph();
    const s = getLayoutStrategy('network');
    for (const e of edges) {
      expect(isEdgeValidForLayout(s, e, nodes, edges)).toBe(true);
    }
  });

  it("в free (edgeConstraint 'any') невалидных рёбер не бывает", () => {
    const { nodes, edges } = sampleGraph();
    const s = getLayoutStrategy('free');
    for (const e of edges) {
      expect(isEdgeValidForLayout(s, e, nodes, edges)).toBe(true);
    }
  });
});

describe('геометрические свойства ключевых раскладок', () => {
  it('hierarchy: дети ниже корня (TB)', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('hierarchy').layout(nodes, edges);
    const root = out.find((n) => n.id === 'R')!;
    const a = out.find((n) => n.id === 'A')!;
    expect(a.position.y).toBeGreaterThan(root.position.y);
  });

  it('hierarchy: сиблинги ложатся в order-переставленном порядке (не в порядке создания)', () => {
    const nodes = [
      makeNode('R', true),
      { ...makeNode('A'), data: { label: 'A', order: 1 } },
      { ...makeNode('B'), data: { label: 'B', order: 0 } },
    ];
    const edges = [treeEdge('R', 'A'), treeEdge('R', 'B')];
    const out = getLayoutStrategy('hierarchy').layout(nodes, edges);
    const a = out.find((n) => n.id === 'A')!;
    const b = out.find((n) => n.id === 'B')!;
    // B имеет order=0 (раньше A) — должен лечь левее при равной глубине.
    expect(b.position.x).toBeLessThan(a.position.x);
  });

  it('tree (радиальное): корень в центре, дети на кольце вокруг', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('tree').layout(nodes, edges);
    const root = out.find((n) => n.id === 'R')!;
    expect(root.position).toEqual({ x: 0, y: 0 });
    const a = out.find((n) => n.id === 'A')!;
    const dist = Math.hypot(a.position.x, a.position.y);
    expect(dist).toBeGreaterThan(100);
  });

  it('fishbone: голова (корень) правее категорий', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('fishbone').layout(nodes, edges);
    const root = out.find((n) => n.id === 'R')!;
    const a = out.find((n) => n.id === 'A')!;
    const b = out.find((n) => n.id === 'B')!;
    expect(a.position.x).toBeLessThan(root.position.x);
    expect(b.position.x).toBeLessThan(root.position.x);
    // Кости чередуются: первая категория сверху, вторая снизу.
    expect(Math.sign(a.position.y)).not.toBe(Math.sign(b.position.y));
  });

  it('bubble: спутники на общем расстоянии от центра', () => {
    const nodes = [makeNode('R', true), makeNode('A'), makeNode('B'), makeNode('C')];
    const edges = [treeEdge('R', 'A'), treeEdge('R', 'B'), treeEdge('R', 'C')];
    const out = getLayoutStrategy('bubble').layout(nodes, edges);
    const root = out.find((n) => n.id === 'R')!;
    expect(root.position).toEqual({ x: 0, y: 0 });
    const dists = ['A', 'B', 'C'].map((id) => {
      const n = out.find((x) => x.id === id)!;
      return Math.round(Math.hypot(n.position.x, n.position.y));
    });
    expect(dists[0]).toBe(dists[1]);
    expect(dists[1]).toBe(dists[2]);
  });

  it('network: узлы расходятся (не совпадают), позиции конечны', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('network').layout(nodes, edges);
    const positions = out.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(positions).size).toBe(out.length);
  });

  it('free: позиции узлов не пересчитываются (identity)', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('free').layout(nodes, edges);
    out.forEach((n, i) => {
      expect(n.position).toEqual(nodes[i].position);
    });
  });

  it('right: корень слева, потомки правее (X растёт с глубиной)', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('right').layout(nodes, edges);
    const root = out.find((n) => n.id === 'R')!;
    const a = out.find((n) => n.id === 'A')!;
    const c = out.find((n) => n.id === 'C')!; // внук (A → C)
    expect(a.position.x).toBeGreaterThan(root.position.x);
    expect(c.position.x).toBeGreaterThan(a.position.x);
  });

  it('left: зеркало right — потомки левее (X убывает с глубиной)', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('left').layout(nodes, edges);
    const root = out.find((n) => n.id === 'R')!;
    const a = out.find((n) => n.id === 'A')!;
    const c = out.find((n) => n.id === 'C')!;
    expect(a.position.x).toBeLessThan(root.position.x);
    expect(c.position.x).toBeLessThan(a.position.x);
  });

  it('org: корень наверху, потомки ниже (Y растёт с глубиной)', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('org').layout(nodes, edges);
    const root = out.find((n) => n.id === 'R')!;
    const a = out.find((n) => n.id === 'A')!;
    const c = out.find((n) => n.id === 'C')!;
    expect(a.position.y).toBeGreaterThan(root.position.y);
    expect(c.position.y).toBeGreaterThan(a.position.y);
  });

  it('logic: как right — компактный аутлайн, X растёт с глубиной', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('logic').layout(nodes, edges);
    const root = out.find((n) => n.id === 'R')!;
    const a = out.find((n) => n.id === 'A')!;
    expect(a.position.x).toBeGreaterThan(root.position.x);
  });
});

describe('порядок сиблингов по data.order (Phase 2 семейства)', () => {
  /** Корень с тремя детьми X/Y/Z; order намеренно не совпадает с порядком массива. */
  function orderedStar(): { nodes: AppNode[]; edges: AppEdge[] } {
    const nodes: AppNode[] = [
      makeNode('R', true),
      { ...makeNode('X'), data: { label: 'X', order: 2 } },
      { ...makeNode('Y'), data: { label: 'Y', order: 0 } },
      { ...makeNode('Z'), data: { label: 'Z', order: 1 } },
    ];
    const edges = [treeEdge('R', 'X'), treeEdge('R', 'Y'), treeEdge('R', 'Z')];
    return { nodes, edges };
  }

  for (const kind of ['right', 'left', 'logic'] as const) {
    it(`${kind}: сиблинги сверху вниз в порядке order (Y, Z, X)`, () => {
      const { nodes, edges } = orderedStar();
      const out = getLayoutStrategy(kind).layout(nodes, edges);
      const y = out.find((n) => n.id === 'Y')!.position.y;
      const z = out.find((n) => n.id === 'Z')!.position.y;
      const x = out.find((n) => n.id === 'X')!.position.y;
      expect(y).toBeLessThan(z);
      expect(z).toBeLessThan(x);
    });
  }

  it('org: сиблинги слева направо в порядке order (Y, Z, X)', () => {
    const { nodes, edges } = orderedStar();
    const out = getLayoutStrategy('org').layout(nodes, edges);
    const y = out.find((n) => n.id === 'Y')!.position.x;
    const z = out.find((n) => n.id === 'Z')!.position.x;
    const x = out.find((n) => n.id === 'X')!.position.x;
    expect(y).toBeLessThan(z);
    expect(z).toBeLessThan(x);
  });

  it('timeline: пункты слева направо в порядке order (Y, Z, X)', () => {
    const { nodes, edges } = orderedStar();
    const out = getLayoutStrategy('timeline').layout(nodes, edges);
    const y = out.find((n) => n.id === 'Y')!.position.x;
    const z = out.find((n) => n.id === 'Z')!.position.x;
    const x = out.find((n) => n.id === 'X')!.position.x;
    expect(y).toBeLessThan(z);
    expect(z).toBeLessThan(x);
  });
});

describe('both: разбиение по чётности индекса и группировка потомков по стороне', () => {
  function fourChildren(): { nodes: AppNode[]; edges: AppEdge[] } {
    const nodes: AppNode[] = [
      makeNode('R', true),
      { ...makeNode('A'), data: { label: 'A', order: 0 } },
      { ...makeNode('B'), data: { label: 'B', order: 1 } },
      { ...makeNode('C'), data: { label: 'C', order: 2 } },
      { ...makeNode('D'), data: { label: 'D', order: 3 } },
    ];
    const edges = [treeEdge('R', 'A'), treeEdge('R', 'B'), treeEdge('R', 'C'), treeEdge('R', 'D')];
    return { nodes, edges };
  }

  it('чётные индексы (A, C) — справа; нечётные (B, D) — слева', () => {
    const { nodes, edges } = fourChildren();
    const out = getLayoutStrategy('both').layout(nodes, edges);
    const root = out.find((n) => n.id === 'R')!;
    for (const id of ['A', 'C']) {
      expect(out.find((n) => n.id === id)!.position.x).toBeGreaterThan(root.position.x);
    }
    for (const id of ['B', 'D']) {
      expect(out.find((n) => n.id === id)!.position.x).toBeLessThan(root.position.x);
    }
  });

  it('потомок остаётся на стороне своей ветви первого уровня', () => {
    const { nodes, edges } = fourChildren();
    const nodesWithGrandchild: AppNode[] = [...nodes, makeNode('A1')];
    const edgesWithGrandchild = [...edges, treeEdge('A', 'A1')]; // A — справа
    const out = getLayoutStrategy('both').layout(nodesWithGrandchild, edgesWithGrandchild);
    const a = out.find((n) => n.id === 'A')!;
    const a1 = out.find((n) => n.id === 'A1')!;
    expect(Math.sign(a1.position.x)).toBe(Math.sign(a.position.x));
    expect(a1.position.x).toBeGreaterThan(a.position.x); // глубже — дальше от центра
  });
});

describe('отсутствие пересечений (базовый тест плотности) для Phase 2 раскладок', () => {
  /** Прямоугольник узла (позиция — левый верхний угол в layout-выходе withPositions). */
  function rectOf(node: AppNode): { x: number; y: number; w: number; h: number } {
    const w = node.data.isRoot ? 220 : 180;
    const h = node.data.isRoot ? 56 : 48;
    return { x: node.position.x - w / 2, y: node.position.y - h / 2, w, h };
  }

  function overlaps(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function starGraph(n: number): { nodes: AppNode[]; edges: AppEdge[] } {
    const nodes: AppNode[] = [makeNode('R', true)];
    const edges: AppEdge[] = [];
    for (let i = 0; i < n; i++) {
      const id = `C${i}`;
      nodes.push({ ...makeNode(id), data: { label: id, order: i } });
      edges.push(treeEdge('R', id));
    }
    return { nodes, edges };
  }

  for (const kind of ['right', 'left', 'both', 'org', 'logic', 'timeline'] as const) {
    it(`${kind}: 6 детей корня не пересекаются друг с другом`, () => {
      const { nodes, edges } = starGraph(6);
      const out = getLayoutStrategy(kind).layout(nodes, edges);
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          expect(overlaps(rectOf(out[i]), rectOf(out[j]))).toBe(false);
        }
      }
    });
  }
});

describe('смена типа раскладки сохраняет дерево/order (Phase 2)', () => {
  it('переключение между всеми derived-раскладками не меняет parent/order, только координаты', () => {
    const { nodes, edges } = sampleGraph();
    const derivedKinds = LAYOUT_KINDS.filter((k) => getLayoutStrategy(k).positionMode === 'derived');
    for (const kind of derivedKinds) {
      const out = getLayoutStrategy(kind).layout(nodes, edges);
      expect(out.map((n) => n.id)).toEqual(nodes.map((n) => n.id));
      out.forEach((n, i) => {
        expect(n.data.order).toBe(nodes[i].data.order);
        expect(n.data.isRoot).toBe(nodes[i].data.isRoot);
      });
      // Только позиции меняются — рёбра не создаются/не удаляются раскладкой.
      expect(edges).toHaveLength(4);
    }
  });
});
