import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge } from '../../src/store/types';
import { normalizeStructure } from '../../src/features/layout/strategies/normalize';

function makeNode(id: string, isRoot = false, order?: number): AppNode {
  return {
    id,
    type: 'mindNode',
    position: { x: 0, y: 0 },
    data: { label: id, isRoot, order },
  };
}

function treeEdge(id: string, source: string, target: string): AppEdge {
  return { id, source, target, data: { kind: 'tree' } };
}

function freeEdge(id: string, source: string, target: string): AppEdge {
  return { id, source, target, data: { kind: 'free' } };
}

describe('normalizeStructure', () => {
  it('корень с уже валидным деревом: order назначается контактно 0..k-1', () => {
    const nodes = [makeNode('R', true), makeNode('A'), makeNode('B')];
    const edges = [treeEdge('e1', 'R', 'A'), treeEdge('e2', 'R', 'B')];
    const { nodes: out } = normalizeStructure(nodes, edges, 'hierarchy');
    const a = out.find((n) => n.id === 'A')!;
    const b = out.find((n) => n.id === 'B')!;
    expect(new Set([a.data.order, b.data.order])).toEqual(new Set([0, 1]));
  });

  it('единственный корень: лишние isRoot-узлы демоутятся', () => {
    const nodes = [makeNode('R1', true), makeNode('R2', true)];
    const edges: AppEdge[] = [];
    const { nodes: out } = normalizeStructure(nodes, edges, 'hierarchy');
    const roots = out.filter((n) => n.data.isRoot);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('R1'); // первый помеченный остаётся
  });

  it('дублирующиеся входящие tree-рёбра: остаётся один родитель (первый по BFS)', () => {
    const nodes = [makeNode('R', true), makeNode('A'), makeNode('B')];
    // A получает ДВА входящих tree-ребра — от R и от B.
    const edges = [treeEdge('e1', 'R', 'A'), treeEdge('e2', 'B', 'A'), treeEdge('e3', 'R', 'B')];
    const { edges: out } = normalizeStructure(nodes, edges, 'hierarchy');
    const incomingToA = out.filter((e) => e.target === 'A' && e.data?.kind !== 'free');
    expect(incomingToA).toHaveLength(1);
    expect(incomingToA[0].source).toBe('R'); // BFS от корня находит R→A первым
  });

  it('недостижимый узел (изолированное поддерево) прикрепляется прямо к корню', () => {
    const nodes = [makeNode('R', true), makeNode('X'), makeNode('Y')];
    // X→Y существует, но X никак не связан с R — изолированная пара.
    const edges = [treeEdge('e1', 'X', 'Y')];
    const { nodes: out, edges: outEdges } = normalizeStructure(nodes, edges, 'hierarchy');
    expect(out.every((n) => Number.isFinite(n.data.order))).toBe(true);
    // X теперь дочерний узел корня (единственный родитель — R).
    const incomingToX = outEdges.filter((e) => e.target === 'X' && e.data?.kind !== 'free');
    expect(incomingToX).toHaveLength(1);
    expect(incomingToX[0].source).toBe('R');
    // Y остаётся ребёнком X — путь X всё ещё цел.
    const incomingToY = outEdges.filter((e) => e.target === 'Y' && e.data?.kind !== 'free');
    expect(incomingToY).toHaveLength(1);
    expect(incomingToY[0].source).toBe('X');
  });

  it('циклическое tree-ребро отбрасывается BFS-обходом (не плодит второй родитель)', () => {
    const nodes = [makeNode('R', true), makeNode('A'), makeNode('B')];
    // R→A→B, и ещё B→A (цикл) — второе ребро в A отбрасывается.
    const edges = [treeEdge('e1', 'R', 'A'), treeEdge('e2', 'A', 'B'), treeEdge('e3', 'B', 'A')];
    const { edges: out } = normalizeStructure(nodes, edges, 'hierarchy');
    const incomingToA = out.filter((e) => e.target === 'A' && e.data?.kind !== 'free');
    expect(incomingToA).toHaveLength(1);
    expect(incomingToA[0].source).toBe('R');
  });

  it('free-рёбра не трогаются (не считаются структурой, не дублируются)', () => {
    const nodes = [makeNode('R', true), makeNode('A')];
    const edges = [treeEdge('e1', 'R', 'A'), freeEdge('e2', 'A', 'R')];
    const { edges: out } = normalizeStructure(nodes, edges, 'hierarchy');
    expect(out.filter((e) => e.data?.kind === 'free')).toHaveLength(1);
  });

  it('существующий order используется как затравка сортировки сиблингов', () => {
    const nodes = [makeNode('R', true), makeNode('A', false, 5), makeNode('B', false, 1)];
    const edges = [treeEdge('e1', 'R', 'A'), treeEdge('e2', 'R', 'B')];
    const { nodes: out } = normalizeStructure(nodes, edges, 'hierarchy');
    const a = out.find((n) => n.id === 'A')!;
    const b = out.find((n) => n.id === 'B')!;
    expect(b.data.order).toBeLessThan(a.data.order!); // B (order=1) раньше A (order=5)
  });

  it("network: no-op — структура и order не навязываются", () => {
    const nodes = [makeNode('A'), makeNode('B')];
    const edges = [freeEdge('e1', 'A', 'B'), freeEdge('e2', 'B', 'A')]; // цикл, никто не root
    const result = normalizeStructure(nodes, edges, 'network');
    expect(result.nodes).toBe(nodes);
    expect(result.edges).toBe(edges);
  });

  it('пустой список узлов — no-op', () => {
    const result = normalizeStructure([], [], 'hierarchy');
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});
