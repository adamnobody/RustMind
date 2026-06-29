import { describe, it, expect } from 'vitest';
import { pruneStyle } from '../../src/shared/lib/style';

type Rec = Record<string, unknown>;

describe('pruneStyle', () => {
  it('возвращает undefined (а НЕ {}) когда чистить нечего', () => {
    expect(pruneStyle(undefined)).toBeUndefined();
    expect(pruneStyle({})).toBeUndefined();
    expect(pruneStyle({ a: undefined } as Rec)).toBeUndefined();
    expect(pruneStyle({ a: 1 }, { a: 1 })).toBeUndefined(); // всё значение = дефолту
  });

  it('никогда не возвращает пустой объект {}', () => {
    const result = pruneStyle({ a: undefined, b: 2 } as Rec, { a: 1, b: 2 });
    expect(result).toBeUndefined();
    expect(result).not.toEqual({});
  });

  it('режет undefined ДО сравнения с дефолтом: поле-с-дефолтом=undefined → ключа нет', () => {
    // Если бы undefined НЕ резался первым, значение могло бы «подставиться»
    // дефолтом или просочиться как undefined. Должно быть просто undefined.
    expect(pruneStyle({ width: undefined } as Rec, { width: 1 })).toBeUndefined();
  });

  it('дропает и undefined, и значения-дефолты, сохраняя реальные оверрайды', () => {
    expect(
      pruneStyle(
        { shape: 'rounded', width: undefined, color: '#fff' } as Rec,
        { shape: 'rounded', width: 1, color: 'var(--x)' },
      ),
    ).toEqual({ color: '#fff' });
  });

  it('без defaults — режет только undefined (поведение для рёбер до шага 15)', () => {
    expect(pruneStyle({ a: 1, b: undefined } as Rec)).toEqual({ a: 1 });
  });
});
