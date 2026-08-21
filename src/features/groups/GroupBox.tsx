import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { useMindMapStore } from '../../store/mindMapStore';
import { DEFAULT_GROUP_RADIUS, GROUP_TITLE_HEIGHT } from './types';
import { DEFAULT_TITLE_PLACEMENT, snapTitleToBorder, titleChipStyle } from './titlePlacement';
import type { Group } from '../../domain/mind-map';
import styles from './GroupBox.module.css';

interface GroupBoxData {
  group: Group;
  selected: boolean;
}

/**
 * Полупрозрачная область группы (RF-нода типа groupBox). Тело — pointer-events:
 * none (клики проходят к узлам внутри); интерактивен только чип заголовка:
 * клик выбирает группу, drag двигает чип по периметру, × удаляет.
 */
export function GroupBox({ data }: NodeProps): React.JSX.Element {
  const { group, selected } = data as unknown as GroupBoxData;
  const rootRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const setSelectedGroupId = useUIStore((s) => s.setSelectedGroupId);
  const deleteGroup = useMindMapStore((s) => s.deleteGroup);
  const updateGroup = useMindMapStore((s) => s.updateGroup);

  const accent = group.color;
  const radius = group.borderRadius ?? DEFAULT_GROUP_RADIUS;
  const placement = group.titlePlacement ?? DEFAULT_TITLE_PLACEMENT;

  const boxStyle: CSSProperties = {
    borderRadius: radius,
    ...(accent
      ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }
      : {}),
  };

  const ts = group.titleStyle;
  const titleStyle: CSSProperties = {
    ...titleChipStyle(placement),
    height: GROUP_TITLE_HEIGHT,
    color: ts?.color,
    fontSize: ts?.fontSize,
    fontWeight: ts?.bold ? 700 : undefined,
    fontStyle: ts?.italic ? 'italic' : undefined,
    textDecoration: ts?.underline ? 'underline' : undefined,
    fontFamily: ts?.fontFamily ? `"${ts.fontFamily}"` : undefined,
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
        className={clsx(styles.titleChip, selected && styles.titleChipSelected)}
        style={titleStyle}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          dragging.current = true;
          setSelectedGroupId(group.id);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          e.stopPropagation();
          projectPointer(e);
        }}
        onPointerUp={(e) => {
          if (!dragging.current) return;
          dragging.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <span className={styles.title}>{group.title}</span>
        {selected ? (
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
