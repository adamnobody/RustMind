import { describe, it, expect } from 'vitest';
import { groupBounds, idsInArea, rectsOverlap } from '../../src/features/groups/bounds';

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
