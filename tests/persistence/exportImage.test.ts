import { describe, it, expect } from 'vitest';
import { jpegToPdf } from '../../src/features/persistence/exportPdf';

describe('jpegToPdf', () => {
  it('пишет валидный однокартиночный PDF с точными смещениями xref', () => {
    // Псевдо-JPEG произвольной длины — важно только смещение потока в xref.
    const jpeg = new Uint8Array(777).fill(0xab);
    const pdf = jpegToPdf(jpeg, 300, 200);
    // latin1: байт↔символ 1:1, поэтому строковые индексы == байтовым смещениям.
    const s = new TextDecoder('latin1').decode(pdf);

    expect(s.startsWith('%PDF-1.3')).toBe(true);
    expect(s).toContain('/Filter /DCTDecode');
    expect(s).toContain('/MediaBox [0 0 300 200]');
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);

    const startxref = Number(/startxref\n(\d+)/.exec(s)?.[1]);
    const entries = s.slice(startxref).split('\n').slice(2, 8);
    expect(entries).toHaveLength(6);

    // Смещение объекта N в xref должно указывать ровно на "N 0 obj" —
    // проверяет корректность учёта длины бинарного потока картинки.
    const off1 = Number(entries[1].slice(0, 10));
    const off5 = Number(entries[5].slice(0, 10));
    expect(s.slice(off1, off1 + 7)).toBe('1 0 obj');
    expect(s.slice(off5, off5 + 7)).toBe('5 0 obj');
  });
});
