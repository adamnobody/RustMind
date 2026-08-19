export const LINK_ARROW = ' → ';
const ARROW_RE = /\s*(?:→|->)\s*/;
const LIST_PREFIX_RE = /^(\s*(?:[-*+]|\d+\.)\s+)/;
const LINKS_HEADING = /^##\s+links\s*$/i;
const HEADING_RE = /^#{1,6}\s+/;

export type LinkSlot = {
  slot: 'source' | 'target';
  query: string;
  replaceFrom: number;
  replaceTo: number;
  /** Подпись другой стороны этой же строки — её не предлагаем. */
  peer?: string;
};

function lineBounds(value: string, cursor: number): { start: number; end: number } {
  const start = value.lastIndexOf('\n', cursor - 1) + 1;
  const nl = value.indexOf('\n', cursor);
  return { start, end: nl === -1 ? value.length : nl };
}

/** Курсор внутри блока `## Links` (до следующего заголовка). */
export function inLinksSection(value: string, cursor: number): boolean {
  const before = value.slice(0, Math.max(0, cursor));
  const lines = before.split('\n');
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (LINKS_HEADING.test(trimmed)) inSection = true;
    else if (inSection && HEADING_RE.test(trimmed)) inSection = false;
  }
  return inSection;
}

/** Слот «источник» / «цель» на текущей строке списка в Links. */
export function linkSlotAt(value: string, cursor: number): LinkSlot | null {
  if (!inLinksSection(value, cursor)) return null;
  const { start, end } = lineBounds(value, cursor);
  const line = value.slice(start, end);
  const prefix = line.match(LIST_PREFIX_RE);
  if (!prefix) return null;
  const bodyStart = start + prefix[0].length;
  if (cursor < bodyStart) return null;
  const body = value.slice(bodyStart, end);
  const arrow = body.match(ARROW_RE);
  if (!arrow || arrow.index === undefined) {
    return {
      slot: 'source',
      query: value.slice(bodyStart, cursor),
      replaceFrom: bodyStart,
      replaceTo: end,
    };
  }
  const sourceEnd = bodyStart + arrow.index;
  const targetStart = sourceEnd + arrow[0].length;
  const after = value.slice(targetStart, end);
  const colon = after.search(/\s+:\s+/);
  const targetEnd = colon >= 0 ? targetStart + colon : end;
  const sourceText = value.slice(bodyStart, sourceEnd).trim();
  const targetText = value.slice(targetStart, targetEnd).trim();
  if (cursor <= sourceEnd) {
    return {
      slot: 'source',
      query: value.slice(bodyStart, cursor),
      replaceFrom: bodyStart,
      replaceTo: sourceEnd,
      peer: targetText || undefined,
    };
  }
  if (cursor >= targetStart && cursor <= targetEnd) {
    return {
      slot: 'target',
      query: value.slice(targetStart, cursor),
      replaceFrom: targetStart,
      replaceTo: targetEnd,
      peer: sourceText || undefined,
    };
  }
  return null;
}

export function suggestLabels(labels: string[], query: string, exclude?: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const label of labels) {
    const t = label.trim();
    if (!t || t === exclude || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    uniq.push(t);
  }
  const prefix: string[] = [];
  const inner: string[] = [];
  for (const label of uniq) {
    const low = label.toLowerCase();
    if (low.startsWith(q)) prefix.push(label);
    else if (low.includes(q)) inner.push(label);
  }
  return [...prefix, ...inner].slice(0, 8);
}

export function applyLinkSuggestion(
  value: string,
  slot: LinkSlot,
  label: string,
): { value: string; cursor: number } {
  const before = value.slice(0, slot.replaceFrom);
  const after = value.slice(slot.replaceTo);
  if (slot.slot === 'source') {
    const hasArrow = /^\s*(?:→|->)/.test(after);
    const insert = hasArrow ? label : `${label}${LINK_ARROW}`;
    return { value: before + insert + after, cursor: before.length + insert.length };
  }
  return { value: before + label + after, cursor: before.length + label.length };
}

/** Enter/Space на источнике без выбранной подсказки: дописать стрелку после набранного. */
export function insertLinkArrow(value: string, slot: LinkSlot): { value: string; cursor: number } | null {
  if (slot.slot !== 'source') return null;
  const typed = value.slice(slot.replaceFrom, slot.replaceTo).trim();
  if (!typed) return null;
  return applyLinkSuggestion(value, slot, typed);
}

export function flattenOutlineLabels(
  roots: { label: string; children: unknown[] }[],
): string[] {
  const out: string[] = [];
  const walk = (n: { label: string; children: unknown[] }): void => {
    if (n.label.trim()) out.push(n.label);
    for (const child of n.children) walk(child as { label: string; children: unknown[] });
  };
  for (const root of roots) walk(root);
  return out;
}
