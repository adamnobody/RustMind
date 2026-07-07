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
    expect(Object.keys(LAYOUT_STRATEGIES)).toHaveLength(5);
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
  });

  it('каждая стратегия объявляет positionMode: derived везде, кроме network (stored)', () => {
    for (const kind of LAYOUT_KINDS) {
      const expected = kind === 'network' ? 'stored' : 'derived';
      expect(getLayoutStrategy(kind).positionMode).toBe(expected);
    }
  });

  it('coerceLayoutKind: новые как есть, legacy и упразднённые мапятся, мусор → hierarchy', () => {
    expect(coerceLayoutKind('fishbone')).toBe('fishbone');
    expect(coerceLayoutKind('tree-LR')).toBe('hierarchy');
    expect(coerceLayoutKind('tree-TB')).toBe('hierarchy');
    expect(coerceLayoutKind('radial')).toBe('tree');
    expect(coerceLayoutKind('free')).toBe('hierarchy');
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

  for (const kind of ['hierarchy', 'tree', 'fishbone'] as const) {
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
});
