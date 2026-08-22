import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { useMindMapStore } from '../../store/mindMapStore';
import { DEFAULT_GROUP_RADIUS, GROUP_TITLE_HEIGHT } from './types';
import { DEFAULT_TITLE_PLACEMENT, snapTitleToBorder, titleChipStyle } from './titlePlacement';
import type { Group } from '../../domain/mind-map';
import styles from './GroupBox.module.css';

const DRAG_PX = 4;

interface GroupBoxData {
  group: Group;
  selected: boolean;
}

function titleTextStyle(group: Group): CSSProperties {
  const ts = group.titleStyle;
  return {
    color: ts?.color,
    fontSize: ts?.fontSize,
    fontWeight: ts?.bold ? 700 : undefined,
    fontStyle: ts?.italic ? 'italic' : undefined,
    textDecoration: ts?.underline ? 'underline' : undefined,
    fontFamily: ts?.fontFamily ? `"${ts.fontFamily}"` : undefined,
  };
}

/**
 * Полупрозрачная область группы (RF-нода типа groupBox). Тело — pointer-events:
 * none (ЛКМ/ПКМ нод внутри проходят насквозь); ПКМ по пустой области ловит
 * pane hit-test. Интерактивен чип заголовка: клик — правки, drag — якорь, ПКМ —
 * меню группы.
 */
export function GroupBox({ data }: NodeProps): React.JSX.Element {
  const { group, selected } = data as unknown as GroupBoxData;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const setSelectedGroupId = useUIStore((s) => s.setSelectedGroupId);
  const setEditingGroupId = useUIStore((s) => s.setEditingGroupId);
  const editingGroupId = useUIStore((s) => s.editingGroupId);
  const editingIntent = useUIStore((s) => s.editingIntent);
  const deleteGroup = useMindMapStore((s) => s.deleteGroup);
  const updateGroup = useMindMapStore((s) => s.updateGroup);
  const setGroupTitle = useMindMapStore((s) => s.setGroupTitle);
  const isEditing = editingGroupId === group.id;
  const [draft, setDraft] = useState(group.title);

  const accent = group.color;
  const radius = group.borderRadius ?? DEFAULT_GROUP_RADIUS;
  const placement = group.titlePlacement ?? DEFAULT_TITLE_PLACEMENT;
  const textStyle = titleTextStyle(group);

  useEffect(() => {
    if (!isEditing) return;
    const next =
      editingIntent?.mode === 'replace' ? (editingIntent.initialValue ?? '') : group.title;
    setDraft(next);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      if (editingIntent?.mode === 'replace') {
        el.setSelectionRange(next.length, next.length);
      } else {
        el.select();
      }
    });
  }, [isEditing, editingIntent, group.title]);

  const commit = (): void => {
    const trimmed = draft.trim();
    if (trimmed.length > 0 && trimmed !== group.title) setGroupTitle(group.id, trimmed);
    setEditingGroupId(null);
  };

  const boxStyle: CSSProperties = {
    borderRadius: radius,
    ...(accent
      ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }
      : {}),
  };

  const chipStyle: CSSProperties = {
    ...titleChipStyle(placement),
    minHeight: GROUP_TITLE_HEIGHT,
    ...(accent
      ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 28%, var(--rm-panel))` }
      : {}),
  };

  const projectPointer = (e: PointerEvent<HTMLElement>): void => {
    const box = rootRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    updateGroup(group.id, {
      titlePlacement: snapTitleToBorder(e.clientX - r.left, e.clientY - r.top, r.width, r.height),
    });
  };

  return (
    <div ref={rootRef} className={clsx(styles.group, selected && styles.selected)} style={boxStyle}>
      <div
        className={clsx(styles.titleChip, selected && styles.titleChipSelected, isEditing && styles.titleChipEditing)}
        style={chipStyle}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedGroupId(group.id);
          useUIStore.getState().openGroupContextMenu(group.id, e.clientX, e.clientY);
        }}
        onPointerDown={(e) => {
          if (isEditing) return;
          e.stopPropagation();
          if (e.button !== 0) {
            setSelectedGroupId(group.id);
            return;
          }
          e.preventDefault();
          origin.current = { x: e.clientX, y: e.clientY };
          dragged.current = false;
          setSelectedGroupId(group.id);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const start = origin.current;
          if (!start) return;
          e.stopPropagation();
          if (!dragged.current) {
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (dx * dx + dy * dy < DRAG_PX * DRAG_PX) return;
            dragged.current = true;
          }
          projectPointer(e);
        }}
        onPointerUp={(e) => {
          if (!origin.current) return;
          origin.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
          if (!dragged.current) setEditingGroupId(group.id);
          dragged.current = false;
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            className={styles.titleInput}
            style={{ ...textStyle, width: `${Math.max(4, draft.length + 1)}ch` }}
            value={draft}
            aria-label="group title"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setDraft(group.title);
                setEditingGroupId(null);
              }
            }}
          />
        ) : (
          <span className={styles.title} style={textStyle}>
            {group.title}
          </span>
        )}
        {selected && !isEditing ? (
          <button
            type="button"
            className={styles.del}
            aria-label="delete group"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              deleteGroup(group.id);
              setSelectedGroupId(null);
            }}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
