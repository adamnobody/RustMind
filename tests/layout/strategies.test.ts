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
    expect(Object.keys(LAYOUT_STRATEGIES)).toHaveLength(11);
  });

  it('coerceLayoutKind: новые как есть, legacy мапятся, мусор → free', () => {
    expect(coerceLayoutKind('fishbone')).toBe('fishbone');
    expect(coerceLayoutKind('tree-LR')).toBe('hierarchy');
    expect(coerceLayoutKind('tree-TB')).toBe('hierarchy');
    expect(coerceLayoutKind('radial')).toBe('tree');
    expect(coerceLayoutKind('whatever')).toBe('free');
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
  it('free не блокирует ничего (включая второй «родитель» и обратные связи)', () => {
    const { nodes, edges } = sampleGraph();
    const ctx = { nodes, edges };
    const s = getLayoutStrategy('free');
    expect(s.edgeConstraint).toBe('any');
    expect(s.canConnect('A', 'B', ctx)).toBe(true);
    expect(s.canConnect('B', 'A', ctx)).toBe(true);
    expect(s.canConnect('C', 'R', ctx)).toBe(true); // цикл — разрешён
    expect(s.canConnect('R', 'C', ctx)).toBe(true); // второй родитель — разрешён
  });

  it('block и network не ограничивают связи', () => {
    const { nodes, edges } = sampleGraph();
    const ctx = { nodes, edges };
    expect(getLayoutStrategy('block').canConnect('C', 'R', ctx)).toBe(true);
    expect(getLayoutStrategy('network').canConnect('C', 'R', ctx)).toBe(true);
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

  it('bridge: пары вдоль моста — не глубже двух ярусов', () => {
    const { nodes, edges } = sampleGraph();
    const ctx = { nodes, edges };
    const s = getLayoutStrategy('bridge');
    expect(s.canConnect('R', 'new-top', ctx)).toBe(true); // новый верхний элемент
    expect(s.canConnect('B', 'new-bottom', ctx)).toBe(true); // партнёр пары (depth 1)
    expect(s.canConnect('C', 'new-deep', ctx)).toBe(false); // C на глубине 2 — ниже пары нельзя
    expect(s.canConnect('B', 'C', ctx)).toBe(false); // у C уже есть родитель
  });

  it('multiflow: только причина→событие→следствие', () => {
    const { nodes, edges } = sampleGraph();
    const ctx = { nodes, edges };
    const s = getLayoutStrategy('multiflow');
    expect(s.canConnect('O', 'R', ctx)).toBe(true); // причина → событие
    expect(s.canConnect('R', 'O', ctx)).toBe(true); // событие → следствие
    expect(s.canConnect('A', 'B', ctx)).toBe(false); // мимо события
  });

  it('dialogue: связи только между дорожками (чередование по порядку)', () => {
    const { nodes, edges } = sampleGraph();
    const ctx = { nodes, edges };
    const s = getLayoutStrategy('dialogue');
    // BFS-порядок: R(0), A(1), B(2), C(3), O(4) → дорожки 0,1,0,1,0.
    expect(s.canConnect('R', 'A', ctx)).toBe(true); // дорожки 0 и 1
    expect(s.canConnect('R', 'B', ctx)).toBe(false); // обе на дорожке 0
    expect(s.canConnect('A', 'C', ctx)).toBe(false); // обе на дорожке 1
    expect(s.canConnect('B', 'C', ctx)).toBe(true);
  });

  it('flowchart: направленный поток, циклы запрещены, несколько входов — можно', () => {
    const { nodes, edges } = sampleGraph();
    const ctx = { nodes, edges };
    const s = getLayoutStrategy('flowchart');
    expect(s.canConnect('C', 'R', ctx)).toBe(false); // путь R→A→C уже есть — цикл
    expect(s.canConnect('C', 'O', ctx)).toBe(true);
    expect(s.canConnect('R', 'C', ctx)).toBe(true); // второй вход в C — валидное слияние потоков
    expect(s.canConnect('A', 'A', ctx)).toBe(false);
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

  it("в 'any'-раскладках (free/block/network) невалидных рёбер не бывает", () => {
    const { nodes, edges } = sampleGraph();
    for (const kind of ['free', 'block', 'network'] as const) {
      const s = getLayoutStrategy(kind);
      for (const e of edges) {
        expect(isEdgeValidForLayout(s, e, nodes, edges)).toBe(true);
      }
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

  it('multiflow: причины слева от события, следствия справа', () => {
    const nodes = [makeNode('E', true), makeNode('cause'), makeNode('effect')];
    const edges = [freeEdge('cause', 'E'), freeEdge('E', 'effect')];
    const out = getLayoutStrategy('multiflow').layout(nodes, edges);
    const event = out.find((n) => n.id === 'E')!;
    expect(out.find((n) => n.id === 'cause')!.position.x).toBeLessThan(event.position.x);
    expect(out.find((n) => n.id === 'effect')!.position.x).toBeGreaterThan(event.position.x);
  });

  it('dialogue: две дорожки, реплики чередуются сверху вниз', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('dialogue').layout(nodes, edges);
    const xs = new Set(out.map((n) => n.position.x));
    expect(xs.size).toBe(2); // ровно две дорожки
    const ys = out.map((n) => n.position.y);
    expect(new Set(ys).size).toBe(out.length); // каждый на своей строке
  });

  it('bridge: пары сверху/снизу линии моста', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('bridge').layout(nodes, edges);
    const a = out.find((n) => n.id === 'A')!; // верхняя дорожка
    const c = out.find((n) => n.id === 'C')!; // партнёр A снизу
    expect(a.position.y).toBeLessThan(0);
    expect(c.position.y).toBeGreaterThan(0);
    expect(c.position.x).toBe(a.position.x); // пара — одна колонка
  });

  it('free: позиции остаются как есть', () => {
    const { nodes, edges } = sampleGraph();
    const out = getLayoutStrategy('free').layout(nodes, edges);
    expect(out.map((n) => n.position)).toEqual(nodes.map((n) => n.position));
  });
});
