import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { useT } from '../../../shared/i18n';
import {
  applyMarkdownToGraph,
  mapToMarkdown,
} from '../../persistence/exportMarkdown';
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
  const selRef = useRef<{ start: number; end: number } | null>(null);

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
    },
    [commit],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    const el = e.currentTarget;
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
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      useUIStore.getState().toggleOutline();
    }
  };

  if (!outlineOpen) return null;

  return (
    <div className={styles.overlay}>
      <p className={styles.hint}>{t('outline.hint')}</p>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        spellCheck={false}
        placeholder={t('outline.placeholder')}
        aria-label={t('tile.outline')}
        onChange={(e) => applyText(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
