import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge } from '../../src/store/types';
import { resolveEdgeRoute } from '../../src/features/edges/lib/resolveRoute';
import { sidePort, type EdgeRoutingChoice, type Rect } from '../../src/features/edges/lib/routing';
import { getLayoutStrategy } from '../../src/features/layout/strategies/registry';
import type { LayoutKind } from '../../src/features/layout/engines/layoutTypes';

const RECTS: Record<string, Rect> = {
  R: { x: 0, y: 0, width: 220, height: 56 },
  A: { x: -200, y: 200, width: 180, height: 48 },
  B: { x: 200, y: 200, width: 180, height: 48 },
};

const nodes: AppNode[] = [
  { id: 'R', type: 'mindNode', position: { x: 0, y: 0 }, data: { label: 'R', isRoot: true, order: 0 } },
  { id: 'A', type: 'mindNode', position: { x: -200, y: 200 }, data: { label: 'A', order: 0 } },
  { id: 'B', type: 'mindNode', position: { x: 200, y: 200 }, data: { label: 'B', order: 1 } },
];

const treeEdges: AppEdge[] = [
  { id: 'e1', source: 'R', target: 'A', data: { kind: 'tree' } },
  { id: 'e2', source: 'R', target: 'B', data: { kind: 'tree' } },
];

function route(
  kind: LayoutKind,
  geometry: EdgeRoutingChoice,
  { isTree = true, target = 'A' }: { isTree?: boolean; target?: string } = {},
): ReturnType<typeof resolveEdgeRoute> {
  const sourceRect = RECTS.R;
  const targetRect = RECTS[target];
  return resolveEdgeRoute({
    geometry,
    isTree,
    strategy: getLayoutStrategy(kind),
    ctx: {
      sourceId: 'R',
      targetId: target,
      sourceRect,
      targetRect,
      rectOf: (id) => RECTS[id],
      nodes,
      edges: isTree ? treeEdges : [{ id: 'f1', source: 'R', target, data: { kind: 'free' } }],
    },
    handles: { source: sidePort(sourceRect, 'right'), target: sidePort(targetRect, 'left') },
  });
}

describe('приоритеты маршрутизации', () => {
  it('явный routing перебивает семантический маршрут раскладки', () => {
    const auto = route('org', 'auto');
    const explicit = route('org', 'bezier');
    expect(auto.path).not.toBe(explicit.path);
    expect(explicit.path).toContain('C'); // кубическая безье, а не шина оргструктуры
    expect(auto.source.side).toBe('bottom'); // шина: выход снизу
  });

  it("отсутствие поля эквивалентно 'auto' (старые документы)", () => {
    const style: { routing?: EdgeRoutingChoice } = {};
    const merged: EdgeRoutingChoice = style.routing ?? 'auto';
    expect(route('org', merged).path).toBe(route('org', 'auto').path);
  });

  it('free-связь не получает семантический маршрут дерева', () => {
    for (const kind of ['org', 'timeline', 'fishbone', 'hierarchy', 'logic'] as const) {
      const tree = route(kind, 'auto', { isTree: true });
      const free = route(kind, 'auto', { isTree: false });
      expect(free.path).not.toBe(tree.path);
    }
  });

  it('free-связь при auto идёт общим routing раскладки (не шиной/осью)', () => {
    // hierarchy объявляет bezier как общий fallback — свободная связь его и получает.
    expect(route('hierarchy', 'auto', { isTree: false }).path).toContain('C');
  });

  it('смена раскладки меняет auto-маршрут, но не явный override', () => {
    const autoPaths = new Set(
      (['hierarchy', 'right', 'left', 'org', 'logic'] as const).map((k) => route(k, 'auto').path),
    );
    expect(autoPaths.size).toBeGreaterThan(1);

    const explicitPaths = new Set(
      (['hierarchy', 'right', 'left', 'org', 'logic'] as const).map((k) => route(k, 'step').path),
    );
    expect(explicitPaths.size).toBe(1);
  });

  it('free-раскладка: auto держит ручные хэндлы, override применяет геометрию между ними', () => {
    const auto = route('free', 'auto');
    expect(auto.source.side).toBe('right'); // литеральный хэндл, а не пересчёт
    expect(auto.target.side).toBe('left');

    const ortho = route('free', 'orthogonal');
    expect(ortho.source).toEqual(auto.source); // границы те же
    expect(ortho.target).toEqual(auto.target);
    expect(ortho.path).not.toBe(auto.path); // а форма — выбранная
    expect(ortho.path).not.toMatch(/[CQ]/);
  });

  it('выбор геометрии не трогает структуру: узлы и рёбра остаются как были', () => {
    const nodesBefore = JSON.stringify(nodes);
    const edgesBefore = JSON.stringify(treeEdges);
    for (const geometry of ['auto', 'straight', 'bezier', 'smoothstep', 'orthogonal', 'step'] as const) {
      route('org', geometry);
    }
    expect(JSON.stringify(nodes)).toBe(nodesBefore);
    expect(JSON.stringify(treeEdges)).toBe(edgesBefore);
  });
});
