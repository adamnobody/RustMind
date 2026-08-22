import { describe, it, expect } from 'vitest';
import {
  groupBounds,
  paddedGroupBounds,
  smallestBoundsAt,
  idsInArea,
  rectsOverlap,
} from '../../src/features/groups/bounds';

describe('groupBounds', () => {
  it('охватывает все прямоугольники', () => {
    const b = groupBounds([
      { x: 0, y: 0, w: 100, h: 40 },
      { x: 200, y: 80, w: 100, h: 40 },
    ]);
    expect(b).toEqual({ x: 0, y: 0, width: 300, height: 120 });
  });

  it('null для пустого набора', () => {
    expect(groupBounds([])).toBeNull();
  });

  it('один прямоугольник = его собственные границы', () => {
    expect(groupBounds([{ x: 10, y: 20, w: 50, h: 30 }])).toEqual({
      x: 10,
      y: 20,
      width: 50,
      height: 30,
    });
  });
});

describe('paddedGroupBounds', () => {
  it('расширяет bbox на padding с каждой стороны', () => {
    expect(paddedGroupBounds([{ x: 10, y: 20, w: 50, h: 30 }], 8)).toEqual({
      x: 2,
      y: 12,
      width: 66,
      height: 46,
    });
  });
});

describe('smallestBoundsAt', () => {
  const items = [
    { id: 'outer', bounds: { x: 0, y: 0, width: 200, height: 200 } },
    { id: 'inner', bounds: { x: 40, y: 40, width: 40, height: 40 } },
  ];

  it('берёт меньшую область при наложении', () => {
    expect(smallestBoundsAt(items, { x: 50, y: 50 })).toBe('inner');
  });

  it('берёт внешнюю, если точка только в ней', () => {
    expect(smallestBoundsAt(items, { x: 10, y: 10 })).toBe('outer');
  });

  it('null вне всех областей', () => {
    expect(smallestBoundsAt(items, { x: -1, y: 0 })).toBeNull();
  });
});

describe('idsInArea', () => {
  const nodes = [
    { id: 'a', x: 0, y: 0, w: 40, h: 20 },
    { id: 'b', x: 100, y: 0, w: 40, h: 20 },
    { id: 'c', x: 300, y: 80, w: 40, h: 20 },
  ];

  it('берёт только пересекающиеся узлы', () => {
    expect(idsInArea(nodes, { x: -10, y: -10, w: 80, h: 40 })).toEqual(['a']);
    expect(idsInArea(nodes, { x: -10, y: -10, w: 160, h: 40 })).toEqual(['a', 'b']);
  });

  it('не берёт узел, который лишь рядом с рамкой', () => {
    expect(idsInArea(nodes, { x: 0, y: 0, w: 50, h: 30 })).toEqual(['a']);
    expect(idsInArea(nodes, { x: 0, y: 0, w: 50, h: 30 })).not.toContain('b');
    expect(idsInArea(nodes, { x: 0, y: 0, w: 50, h: 30 })).not.toContain('c');
  });

  it('пустая / вырожденная рамка → никого', () => {
    expect(idsInArea(nodes, { x: 0, y: 0, w: 0, h: 10 })).toEqual([]);
  });
});

describe('rectsOverlap', () => {
  it('касание краем — пересечение', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 0, w: 10, h: 10 })).toBe(true);
  });
});
