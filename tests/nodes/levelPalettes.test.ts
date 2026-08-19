import { describe, it, expect } from 'vitest';
import {
  LEVEL_PALETTES,
  inkOnHex,
  levelColorAt,
  matchingPaletteId,
  paletteFromSeed,
  normalizeHex,
} from '../../src/features/nodes/levelPalettes';

describe('levelPalettes', () => {
  it('восемь палитр, у каждой корень и четыре уровня', () => {
    expect(LEVEL_PALETTES).toHaveLength(8);
    for (const p of LEVEL_PALETTES) {
      expect(p.levels).toHaveLength(4);
      expect(new Set([p.root, ...p.levels]).size).toBe(5);
    }
  });

  it('levelColorAt крутит цвета детей и не красит корень', () => {
    const levels = ['#111111', '#222222'];
    expect(levelColorAt(levels, 0)).toBeUndefined();
    expect(levelColorAt(levels, 1)).toBe('#111111');
    expect(levelColorAt(levels, 2)).toBe('#222222');
    expect(levelColorAt(levels, 3)).toBe('#111111');
    expect(levelColorAt(['', '#abc'], 1)).toBe('#abc');
  });

  it('matchingPaletteId узнаёт выбранную палитру', () => {
    const ocean = LEVEL_PALETTES[0]!;
    expect(matchingPaletteId(ocean.root, [...ocean.levels])).toBe('ocean');
    expect(matchingPaletteId(ocean.root, undefined)).toBeUndefined();
  });

  it('inkOnHex даёт тёмный текст на светлой заливке', () => {
    expect(inkOnHex('#fef3c7')).toBe('#0a1a22');
    expect(inkOnHex('#0f4c75')).toBe('#eafcff');
  });

  it('paletteFromSeed якорит цвет на глубине узла и темнеет к корню', () => {
    const seed = '#2e8ba8';
    const fromRoot = paletteFromSeed(seed, 0)!;
    expect(fromRoot.root).toBe(normalizeHex(seed));
    expect(fromRoot.levels).toHaveLength(4);

    const fromMid = paletteFromSeed(seed, 2)!;
    expect(fromMid.levels[1]).toBe(normalizeHex(seed));
    expect(inkOnHex(fromMid.root)).toBe('#eafcff');
  });
});
