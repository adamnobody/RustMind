import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge, Group } from '../../src/domain/mind-map';
import { DEFAULT_NODE_SIZE } from '../../src/shared/lib/constants';
import { GROUP_CLEARANCE, GROUP_PADDING } from '../../src/features/groups/types';
import { rectsOverlap } from '../../src/features/groups/bounds';
import { separateGroupIntruders, shortestEscape } from '../../src/features/groups/separate';

function node(id: string, x: number, y: number, isRoot = false): AppNode {
  return {
    id,
    type: 'mindNode',
    position: { x, y },
    data: { label: id, isRoot },
    measured: { width: DEFAULT_NODE_SIZE.width, height: DEFAULT_NODE_SIZE.height },
  };
}

function tree(source: string, target: string): AppEdge {
  return { id: `${source}->${target}`, source, target, data: { kind: 'tree' } };
}

describe('shortestEscape', () => {
  it('уже снаружи → нулевой сдвиг', () => {
    expect(
      shortestEscape({ x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: 50, w: 10, h: 10 }, 4),
    ).toEqual({ x: 0, y: 0 });
  });

  it('выносит по ближайшей оси', () => {
    const d = shortestEscape({ x: 8, y: 20, w: 10, h: 10 }, { x: 0, y: 0, w: 100, h: 100 }, 0);
    expect(d.y).toBe(0);
    expect(d.x).toBe(-18);
  });
});

describe('separateGroupIntruders', () => {
  const w = DEFAULT_NODE_SIZE.width;
  const h = DEFAULT_NODE_SIZE.height;

  it('сдвигает чужой узел из AABB членов, членов не трогает', () => {
    const nodes = [
      node('L', 0, 0, true),
      node('mid', 200, 10),
      node('R', 400, 0),
    ];
    const edges: AppEdge[] = [tree('L', 'mid'), tree('L', 'R')];
    const groups: Group[] = [{ id: 'g', title: 'G', nodeIds: ['L', 'R'] }];

    const next = separateGroupIntruders(nodes, edges, groups);
    const L = next.find((n) => n.id === 'L')!;
    const R = next.find((n) => n.id === 'R')!;
    const mid = next.find((n) => n.id === 'mid')!;

    expect(L.position).toEqual({ x: 0, y: 0 });
    expect(R.position).toEqual({ x: 400, y: 0 });

    const box = {
      x: 0 - GROUP_PADDING,
      y: 0 - GROUP_PADDING,
      w: 400 + w + GROUP_PADDING * 2,
      h: h + GROUP_PADDING * 2,
    };
    const inflated = {
      x: box.x - GROUP_CLEARANCE,
      y: box.y - GROUP_CLEARANCE,
      w: box.w + GROUP_CLEARANCE * 2,
      h: box.h + GROUP_CLEARANCE * 2,
    };
    expect(
      rectsOverlap({ x: mid.position.x, y: mid.position.y, w, h }, inflated),
    ).toBe(false);
  });

  it('предка членов группы не двигает', () => {
    const nodes = [
      node('root', 100, 10, true),
      node('a', 0, 0),
      node('b', 400, 0),
    ];
    const edges: AppEdge[] = [tree('root', 'a'), tree('root', 'b')];
    const groups: Group[] = [{ id: 'g', title: 'G', nodeIds: ['a', 'b'] }];
    const next = separateGroupIntruders(nodes, edges, groups);
    expect(next.find((n) => n.id === 'root')!.position).toEqual({ x: 100, y: 10 });
  });

  it('без пересечений возвращает те же позиции', () => {
    const nodes = [node('a', 0, 0, true), node('b', 500, 500)];
    const groups: Group[] = [{ id: 'g', title: 'G', nodeIds: ['a'] }];
    const next = separateGroupIntruders(nodes, [], groups);
    expect(next[1].position).toEqual({ x: 500, y: 500 });
  });
});
