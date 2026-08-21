import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUIStore } from '../../store/uiStore';
import { collapsedHiddenIds } from '../layout/strategies/shared';
import { DEFAULT_NODE_SIZE } from '../../shared/lib/constants';
import { useT } from '../../shared/i18n';
import { idsInArea, type Rect } from './bounds';
import styles from './GroupDrawOverlay.module.css';

interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function screenRect(a: { x: number; y: number }, b: { x: number; y: number }): ScreenRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

function flowArea(
  screenToFlow: (p: { x: number; y: number }) => { x: number; y: number },
  from: { x: number; y: number },
  to: { x: number; y: number },
): Rect {
  const a = screenToFlow(from);
  const b = screenToFlow(to);
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

function nodeIdsInFlowArea(area: Rect): string[] {
  const { nodes, edges } = useMindMapStore.getState();
  const hidden = collapsedHiddenIds(nodes, edges);
  const items = nodes
    .filter((n) => !n.hidden && !hidden.has(n.id))
    .map((n) => ({
      id: n.id,
      x: n.position.x,
      y: n.position.y,
      w: n.measured?.width ?? DEFAULT_NODE_SIZE.width,
      h: n.measured?.height ?? DEFAULT_NODE_SIZE.height,
    }));
  return idsInArea(items, area);
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Поверх холста в режиме «создать группу»: жест рамки → узлы, попавшие
 * в прямоугольник, становятся членами; сама область потом садится по bbox
 * только этих узлов.
 */
export function GroupDrawOverlay(): React.JSX.Element | null {
  const t = useT();
  const active = useUIStore((s) => s.groupDrawMode);
  const setGroupDrawMode = useUIStore((s) => s.setGroupDrawMode);
  const setSelectedGroupId = useUIStore((s) => s.setSelectedGroupId);
  const showNotice = useUIStore((s) => s.showNotice);
  const { screenToFlowPosition } = useReactFlow();
  const origin = useRef<{ x: number; y: number } | null>(null);
  const lastHits = useRef<string[]>([]);
  const [draft, setDraft] = useState<ScreenRect | null>(null);

  const previewHits = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }): string[] => {
      const ids = nodeIdsInFlowArea(flowArea(screenToFlowPosition, from, to));
      if (!sameIds(ids, lastHits.current)) {
        lastHits.current = ids;
        useUIStore.getState().setGroupDrawHitIds(ids);
      }
      return ids;
    },
    [screenToFlowPosition],
  );

  const cancel = useCallback((): void => {
    origin.current = null;
    lastHits.current = [];
    setDraft(null);
    setGroupDrawMode(false);
  }, [setGroupDrawMode]);

  useEffect(() => {
    if (!active) {
      lastHits.current = [];
      return;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, cancel]);

  if (!active) return null;

  const finish = (from: { x: number; y: number }, to: { x: number; y: number }): void => {
    origin.current = null;
    lastHits.current = [];
    setDraft(null);
    setGroupDrawMode(false);

    if (Math.abs(to.x - from.x) < 4 && Math.abs(to.y - from.y) < 4) return;

    const members = nodeIdsInFlowArea(flowArea(screenToFlowPosition, from, to));
    if (members.length === 0) {
      showNotice(t('group.drawEmpty'));
      return;
    }
    const gid = useMindMapStore.getState().createGroup(members);
    if (gid) setSelectedGroupId(gid);
  };

  return (
    <div
      className={styles.overlay}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        origin.current = { x: e.clientX, y: e.clientY };
        lastHits.current = [];
        useUIStore.getState().setGroupDrawHitIds([]);
        setDraft({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
      }}
      onPointerMove={(e) => {
        const start = origin.current;
        if (!start) return;
        setDraft(screenRect(start, { x: e.clientX, y: e.clientY }));
        previewHits(start, { x: e.clientX, y: e.clientY });
      }}
      onPointerUp={(e) => {
        const start = origin.current;
        if (!start) return;
        finish(start, { x: e.clientX, y: e.clientY });
      }}
    >
      <p className={styles.hint}>{t('group.drawHint')}</p>
      {draft && draft.w + draft.h > 0 ? (
        <div
          className={styles.marquee}
          style={{ left: draft.x, top: draft.y, width: draft.w, height: draft.h }}
        />
      ) : null}
    </div>
  );
}
