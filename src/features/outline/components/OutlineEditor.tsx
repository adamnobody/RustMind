import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { useT } from '../../../shared/i18n';
import {
  applyMarkdownToGraph,
  mapToMarkdown,
  parseMarkdownOutline,
} from '../../persistence/exportMarkdown';
import {
  applyLinkSuggestion,
  flattenOutlineLabels,
  insertLinkArrow,
  linkSlotAt,
  suggestLabels,
} from '../lib/linkComplete';
import { caretViewport, placeSuggestMenu, suggestClipRect } from '../lib/caret';
import styles from './OutlineEditor.module.css';

const DEBOUNCE_MS = 250;
const INDENT = '  ';

function lineBlock(value: string, start: number, end: number): { from: number; to: number } {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const at = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const nl = value.indexOf('\n', at);
  return { from, to: nl === -1 ? value.length : nl };
}

function indentBlock(
  value: string,
  start: number,
  end: number,
  outdent: boolean,
): { value: string; start: number; end: number } {
  const { from, to } = lineBlock(value, start, end);
  const block = value.slice(from, to);
  const lines = block.split('\n');
  const nextLines = lines.map((line) => {
    if (outdent) {
      if (line.startsWith(INDENT)) return line.slice(INDENT.length);
      if (line.startsWith('\t')) return line.slice(1);
      return line;
    }
    return `${INDENT}${line}`;
  });
  const nextBlock = nextLines.join('\n');
  const first = lines[0] ?? '';
  const startDelta = outdent
    ? first.startsWith(INDENT)
      ? -INDENT.length
      : first.startsWith('\t')
        ? -1
        : 0
    : INDENT.length;
  return {
    value: value.slice(0, from) + nextBlock + value.slice(to),
    start: Math.max(from, start + startDelta),
    end: end + (nextBlock.length - block.length),
  };
}

function continueList(
  value: string,
  start: number,
  end: number,
): { value: string; cursor: number } | null {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const nl = value.indexOf('\n', start);
  const lineEnd = nl === -1 ? value.length : nl;
  const line = value.slice(lineStart, lineEnd);
  const m = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
  if (!m) return null;
  const indent = m[1] ?? '';
  const body = m[3] ?? '';
  if (body.trim() === '') {
    if (indent.length >= INDENT.length) {
      const nextLine = `${indent.slice(INDENT.length)}- `;
      return {
        value: value.slice(0, lineStart) + nextLine + value.slice(lineEnd),
        cursor: lineStart + nextLine.length,
      };
    }
    return { value: value.slice(0, lineStart) + value.slice(lineEnd), cursor: lineStart };
  }
  const insert = `\n${indent}- `;
  return {
    value: value.slice(0, start) + insert + value.slice(end),
    cursor: start + insert.length,
  };
}

export function OutlineEditor(): React.JSX.Element | null {
  const outlineOpen = useUIStore((s) => s.outlineOpen);
  const registerOutlineFlush = useUIStore((s) => s.registerOutlineFlush);
  const createdAt = useMindMapStore((s) => s.createdAt);
  const filePath = useMindMapStore((s) => s.filePath);
  const t = useT();
  const [text, setText] = useState('');
  const textRef = useRef(text);
  textRef.current = text;
  const historyOnce = useRef(false);
  const lastFlushed = useRef('');
  const timer = useRef<number | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const selRef = useRef<{ start: number; end: number } | null>(null);
  const [suggest, setSuggest] = useState<{ items: string[]; index: number } | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; maxHeight: number } | null>(
    null,
  );

  const refreshSuggest = useCallback((markdown: string, cursor: number): void => {
    const slot = linkSlotAt(markdown, cursor);
    if (!slot) {
      setSuggest(null);
      return;
    }
    const labels = [
      ...flattenOutlineLabels(parseMarkdownOutline(markdown).roots),
      ...useMindMapStore.getState().nodes.map((n) => n.data.label),
    ];
    const items = suggestLabels(labels, slot.query, slot.peer);
    setSuggest(items.length > 0 ? { items, index: 0 } : null);
  }, []);

  const commit = useCallback((markdown: string, record: boolean): boolean => {
    if (markdown === lastFlushed.current) return false;
    const state = useMindMapStore.getState();
    const next = applyMarkdownToGraph(markdown, {
      nodes: state.nodes,
      edges: state.edges,
      groups: state.groups,
      documentName: state.documentName,
    });
    lastFlushed.current = markdown;
    const unchanged =
      next.documentName === state.documentName &&
      mapToMarkdown(next.nodes, next.edges, next.documentName) ===
        mapToMarkdown(state.nodes, state.edges, state.documentName);
    if (unchanged) return false;
    state.replaceTree(next, { skipHistory: !record });
    return true;
  }, []);

  useEffect(() => {
    if (!outlineOpen) return;
    const { nodes, edges, documentName } = useMindMapStore.getState();
    const md = mapToMarkdown(nodes, edges, documentName);
    setText(md);
    lastFlushed.current = md;
    historyOnce.current = false;
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, [outlineOpen, createdAt, filePath]);

  useEffect(() => {
    if (!outlineOpen) {
      registerOutlineFlush(null);
      return undefined;
    }
    const flush = (): void => {
      if (timer.current !== undefined) {
        window.clearTimeout(timer.current);
        timer.current = undefined;
      }
      if (commit(textRef.current, !historyOnce.current)) historyOnce.current = true;
    };
    registerOutlineFlush(flush);
    return () => registerOutlineFlush(null);
  }, [outlineOpen, commit, registerOutlineFlush]);

  useLayoutEffect(() => {
    const sel = selRef.current;
    const el = textareaRef.current;
    if (!sel || !el) return;
    el.setSelectionRange(sel.start, sel.end);
    selRef.current = null;
  }, [text]);

  const applyText = useCallback(
    (next: string, sel?: { start: number; end: number }): void => {
      textRef.current = next;
      if (sel) selRef.current = sel;
      setText(next);
      if (next !== lastFlushed.current) useMindMapStore.getState().markDirty();
      if (timer.current !== undefined) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        if (commit(textRef.current, !historyOnce.current)) historyOnce.current = true;
      }, DEBOUNCE_MS);
      refreshSuggest(next, sel?.start ?? textareaRef.current?.selectionStart ?? next.length);
    },
    [commit, refreshSuggest],
  );

  useLayoutEffect(() => {
    if (!suggest || !textareaRef.current) {
      setMenuPos(null);
      return;
    }
    const menuEl = menuRef.current;
    if (menuEl) menuEl.style.maxHeight = 'none';
    const measured = menuEl?.getBoundingClientRect();
    const menu = {
      width: measured && measured.width > 0 ? measured.width : 220,
      height: measured && measured.height > 0 ? measured.height : suggest.items.length * 34 + 8,
    };
    setMenuPos(
      placeSuggestMenu(
        caretViewport(textareaRef.current),
        menu,
        suggestClipRect(overlayRef.current?.getBoundingClientRect()),
      ),
    );
  }, [suggest, text]);

  const pickSuggestion = useCallback(
    (label: string): boolean => {
      const el = textareaRef.current;
      if (!el) return false;
      const slot = linkSlotAt(el.value, el.selectionStart);
      if (!slot) return false;
      const next = applyLinkSuggestion(el.value, slot, label);
      applyText(next.value, { start: next.cursor, end: next.cursor });
      return true;
    },
    [applyText],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    const el = e.currentTarget;
    const slot = linkSlotAt(el.value, el.selectionStart);

    if (suggest && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setSuggest((s) => {
        if (!s) return s;
        const index = (s.index + delta + s.items.length) % s.items.length;
        return { ...s, index };
      });
      return;
    }

    if (suggest && (e.key === 'Tab' || e.key === 'Enter') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const label = suggest.items[suggest.index] ?? suggest.items[0];
      if (label) {
        e.preventDefault();
        pickSuggestion(label);
        return;
      }
    }

    if (suggest && e.key === ' ' && slot) {
      const label = suggest.items[suggest.index] ?? suggest.items[0];
      if (label) {
        e.preventDefault();
        pickSuggestion(label);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && slot?.slot === 'source') {
      const next = insertLinkArrow(el.value, slot);
      if (next) {
        e.preventDefault();
        applyText(next.value, { start: next.cursor, end: next.cursor });
        return;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (suggest) {
        setSuggest(null);
        return;
      }
      useUIStore.getState().toggleOutline();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const next = indentBlock(el.value, el.selectionStart, el.selectionEnd, e.shiftKey);
      applyText(next.value, { start: next.start, end: next.end });
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const next = continueList(el.value, el.selectionStart, el.selectionEnd);
      if (next) {
        e.preventDefault();
        applyText(next.value, { start: next.cursor, end: next.cursor });
      }
    }
  };

  if (!outlineOpen) return null;

  return (
    <div ref={overlayRef} className={styles.overlay}>
      <p className={styles.hint}>{t('outline.hint')}</p>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        spellCheck={false}
        placeholder={t('outline.placeholder')}
        aria-label={t('tile.outline')}
        onChange={(e) => applyText(e.target.value, { start: e.target.selectionStart, end: e.target.selectionEnd })}
        onKeyDown={onKeyDown}
      />
      {suggest ? (
        <ul
          ref={menuRef}
          className={styles.suggest}
          role="listbox"
          aria-label={t('outline.linkSuggest')}
          style={
            menuPos
              ? { left: menuPos.left, top: menuPos.top, maxHeight: menuPos.maxHeight }
              : { visibility: 'hidden', left: 0, top: 0 }
          }
        >
          {suggest.items.map((item, i) => (
            <li key={item}>
              <button
                type="button"
                role="option"
                aria-selected={i === suggest.index}
                className={i === suggest.index ? styles.suggestActive : styles.suggestItem}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pickSuggestion(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
