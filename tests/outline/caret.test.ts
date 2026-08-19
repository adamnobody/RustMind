import { describe, it, expect } from 'vitest';
import { placeSuggestMenu } from '../../src/features/outline/lib/caret';

const clip = { left: 0, top: 0, right: 800, bottom: 600 };

describe('placeSuggestMenu', () => {
  it('ставит меню под кареткой, если снизу хватает места', () => {
    const pos = placeSuggestMenu(
      { left: 40, top: 80, height: 22 },
      { width: 200, height: 120 },
      clip,
    );
    expect(pos.top).toBeGreaterThan(80 + 22);
    expect(pos.left).toBeGreaterThanOrEqual(40);
  });

  it('открывает вверх, если меню не влезает вниз, даже когда снизу ещё есть место', () => {
    const pos = placeSuggestMenu(
      { left: 40, top: 420, height: 22 },
      { width: 200, height: 180 },
      clip,
    );
    expect(pos.top).toBeLessThan(420);
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(420);
  });

  it('открывает вверх, когда каретка у нижнего края', () => {
    const pos = placeSuggestMenu(
      { left: 40, top: 560, height: 22 },
      { width: 200, height: 180 },
      clip,
    );
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(560);
    expect(pos.top).toBeGreaterThanOrEqual(clip.top);
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(clip.bottom);
  });

  it('не вылезает за правый и нижний край клипа', () => {
    const pos = placeSuggestMenu(
      { left: 760, top: 500, height: 20 },
      { width: 220, height: 240 },
      clip,
    );
    expect(pos.left + 80).toBeLessThanOrEqual(clip.right);
    expect(pos.top).toBeGreaterThanOrEqual(clip.top);
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(clip.bottom);
  });

  it('не заходит в полосу снизу, имитирующую панель задач', () => {
    const withTaskbar = { ...clip, bottom: 552 };
    const pos = placeSuggestMenu(
      { left: 40, top: 500, height: 22 },
      { width: 200, height: 180 },
      withTaskbar,
    );
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(withTaskbar.bottom);
    expect(pos.top).toBeLessThan(500);
  });
});
