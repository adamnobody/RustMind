import { describe, it, expect } from 'vitest';
import {
  applyLinkSuggestion,
  inLinksSection,
  insertLinkArrow,
  linkSlotAt,
  suggestLabels,
} from '../../src/features/outline/lib/linkComplete';

const md = [
  '# Map',
  '',
  '- Каинтрел',
  '  - Города',
  '    - Иммора',
  '    - Антропокант',
  '',
  '## Links',
  '- Иммора',
  '',
].join('\n');

describe('linkSlotAt', () => {
  it('в дереве слота нет, в Links — источник до стрелки', () => {
    expect(inLinksSection(md, md.indexOf('Города'))).toBe(false);
    const at = md.lastIndexOf('- Иммора') + '- Иммора'.length;
    expect(inLinksSection(md, at)).toBe(true);
    const slot = linkSlotAt(md, at);
    expect(slot?.slot).toBe('source');
    expect(slot?.query).toBe('Иммора');
  });

  it('после стрелки — слот цели', () => {
    const line = '# T\n- Root\n\n## Links\n- Alpha → Be';
    const slot = linkSlotAt(line, line.length);
    expect(slot?.slot).toBe('target');
    expect(slot?.query).toBe('Be');
    expect(slot?.peer).toBe('Alpha');
  });
});

describe('suggestLabels / applyLinkSuggestion', () => {
  const labels = ['Каинтрел', 'Города', 'Иммора', 'Антропокант'];

  it('префикс важнее вхождения', () => {
    expect(suggestLabels(labels, 'Ан')).toEqual(['Антропокант']);
    expect(suggestLabels(labels, 'имм')).toEqual(['Иммора']);
  });

  it('Enter на источнике дописывает подпись и стрелку', () => {
    const src = '# T\n- Root\n\n## Links\n- Ан';
    const slot = linkSlotAt(src, src.length)!;
    const next = applyLinkSuggestion(src, slot, 'Антропокант');
    expect(next.value.endsWith('- Антропокант → ')).toBe(true);
    expect(next.value[next.cursor - 1]).toBe(' ');
  });

  it('без подсказки стрелка ставится после набранного', () => {
    const src = '# T\n- Root\n\n## Links\n- Foo';
    const slot = linkSlotAt(src, src.length)!;
    const next = insertLinkArrow(src, slot)!;
    expect(next.value.endsWith('- Foo → ')).toBe(true);
  });

  it('не дублирует стрелку, если она уже есть', () => {
    const src = '# T\n- Root\n\n## Links\n- Ал → Beta';
    const at = src.indexOf('Ал') + 2;
    const slot = linkSlotAt(src, at)!;
    const next = applyLinkSuggestion(src, slot, 'Alpha');
    expect(next.value).toContain('- Alpha → Beta');
    expect(next.value).not.toContain('→  →');
  });

  it('цель заменяется выбранной подписью', () => {
    const src = '# T\n- Root\n\n## Links\n- Alpha → Ка';
    const slot = linkSlotAt(src, src.length)!;
    const next = applyLinkSuggestion(src, slot, 'Каинтрел');
    expect(next.value.endsWith('- Alpha → Каинтрел')).toBe(true);
  });
});
