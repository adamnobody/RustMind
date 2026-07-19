import { describe, it, expect } from 'vitest';
import { groupBounds } from '../../src/features/groups/bounds';

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
