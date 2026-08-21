import { describe, it, expect } from 'vitest';
import { snapTitleToBorder, titleChipStyle } from '../../src/features/groups/titlePlacement';

describe('snapTitleToBorder', () => {
  it('точка у верхнего края → top', () => {
    expect(snapTitleToBorder(50, 2, 100, 80)).toEqual({ side: 'top', offset: 0.5 });
  });

  it('точка у правого края → right', () => {
    expect(snapTitleToBorder(98, 40, 100, 80)).toEqual({ side: 'right', offset: 0.5 });
  });

  it('точка внутри прыгает на ближайшую сторону', () => {
    expect(snapTitleToBorder(10, 40, 100, 80).side).toBe('left');
    expect(snapTitleToBorder(50, 70, 100, 80).side).toBe('bottom');
  });

  it('offset зажимается в 0..1', () => {
    expect(snapTitleToBorder(-20, -5, 100, 80)).toEqual({ side: 'top', offset: 0 });
    expect(snapTitleToBorder(200, 200, 100, 80)).toEqual({ side: 'right', offset: 1 });
  });
});

describe('titleChipStyle', () => {
  it('top: якорь на верхней стороне', () => {
    expect(titleChipStyle({ side: 'top', offset: 0.25 })).toMatchObject({
      top: 0,
      left: '25%',
    });
  });

  it('right: якорь на правой стороне', () => {
    expect(titleChipStyle({ side: 'right', offset: 0.5 })).toMatchObject({
      left: '100%',
      top: '50%',
    });
  });
});
