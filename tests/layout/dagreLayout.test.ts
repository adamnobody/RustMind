import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import { layoutTree } from '../../src/features/layout/lib/layoutTree';
import type { MindNodeData } from '../../src/features/nodes/types';

type TestNode = Node<MindNodeData>;

function makeNode(id: string, isRoot = false): TestNode {
  return {
    id,
    type: 'mindNode',
    position: { x: 0, y: 0 },
    data: { label: id, isRoot },
  };
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target };
}

describe('layoutTree', () => {
  it('returns empty array on empty input', () => {
    expect(layoutTree([], [], { direction: 'LR' })).toEqual([]);
  });

  it('single node gets finite coordinates', () => {
    const [out] = layoutTree([makeNode('root', true)], [], { direction: 'LR' });
    expect(Number.isFinite(out.position.x)).toBe(true);
    expect(Number.isFinite(out.position.y)).toBe(true);
  });

  it('output length equals input length', () => {
    const nodes = [makeNode('root', true), makeNode('a'), makeNode('b')];
    const edges = [makeEdge('root', 'a'), makeEdge('root', 'b')];
    expect(layoutTree(nodes, edges, { direction: 'LR' })).toHaveLength(3);
  });

  it('all nodes have finite positions', () => {
    const nodes = [makeNode('root', true), makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [makeEdge('root', 'a'), makeEdge('a', 'b'), makeEdge('a', 'c')];
    const out = layoutTree(nodes, edges, { direction: 'LR' });
    for (const node of out) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
  });

  it('LR: child is to the right of parent', () => {
    const nodes = [makeNode('root', true), makeNode('child')];
    const edges = [makeEdge('root', 'child')];
    const out = layoutTree(nodes, edges, { direction: 'LR' });
    const root = out.find((n) => n.id === 'root')!;
    const child = out.find((n) => n.id === 'child')!;
    expect(child.position.x).toBeGreaterThan(root.position.x);
  });

  it('TB: child is below parent', () => {
    const nodes = [makeNode('root', true), makeNode('child')];
    const edges = [makeEdge('root', 'child')];
    const out = layoutTree(nodes, edges, { direction: 'TB' });
    const root = out.find((n) => n.id === 'root')!;
    const child = out.find((n) => n.id === 'child')!;
    expect(child.position.y).toBeGreaterThan(root.position.y);
  });

  it('LR vs TB produce different orientations', () => {
    const nodes = [makeNode('root', true), makeNode('child')];
    const edges = [makeEdge('root', 'child')];

    const lr = layoutTree(nodes, edges, { direction: 'LR' });
    const tb = layoutTree(nodes, edges, { direction: 'TB' });

    const lrRoot = lr.find((n) => n.id === 'root')!;
    const lrChild = lr.find((n) => n.id === 'child')!;
    const tbRoot = tb.find((n) => n.id === 'root')!;
    const tbChild = tb.find((n) => n.id === 'child')!;

    // LR: horizontal spread dominates
    expect(Math.abs(lrChild.position.x - lrRoot.position.x)).toBeGreaterThan(
      Math.abs(lrChild.position.y - lrRoot.position.y),
    );
    // TB: vertical spread dominates
    expect(Math.abs(tbChild.position.y - tbRoot.position.y)).toBeGreaterThan(
      Math.abs(tbChild.position.x - tbRoot.position.x),
    );
  });

  it('siblings at the same level do not overlap', () => {
    const nodes = [makeNode('root', true), makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [makeEdge('root', 'a'), makeEdge('root', 'b'), makeEdge('root', 'c')];
    const out = layoutTree(nodes, edges, { direction: 'LR', nodeSep: 20 });

    const siblings = out.filter((n) => n.id !== 'root');
    siblings.sort((a, b) => a.position.y - b.position.y);
    for (let i = 1; i < siblings.length; i++) {
      expect(siblings[i].position.y).toBeGreaterThan(siblings[i - 1].position.y);
    }
  });
});
