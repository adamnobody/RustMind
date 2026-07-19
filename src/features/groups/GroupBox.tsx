import { type CSSProperties } from 'react';
import { type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { useMindMapStore } from '../../store/mindMapStore';
import { GROUP_TITLE_HEIGHT, type Group } from './types';
import styles from './GroupBox.module.css';

interface GroupBoxData {
  group: Group;
  selected: boolean;
}

/**
 * Полупрозрачная область группы (RF-нода типа groupBox). Тело — pointer-events:
 * none (клики проходят к узлам внутри); интерактивна только полоса заголовка:
 * клик выбирает группу (инспектор редактирует заголовок/шрифт), × удаляет.
 */
export function GroupBox({ data }: NodeProps): React.JSX.Element {
  const { group, selected } = data as unknown as GroupBoxData;
  const setSelectedGroupId = useUIStore((s) => s.setSelectedGroupId);
  const deleteGroup = useMindMapStore((s) => s.deleteGroup);

  const accent = group.color;
  const boxStyle: CSSProperties = accent
    ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }
    : {};

  const ts = group.titleStyle;
  const titleStyle: CSSProperties = {
    color: ts?.color,
    fontSize: ts?.fontSize,
    fontWeight: ts?.bold ? 700 : undefined,
    fontStyle: ts?.italic ? 'italic' : undefined,
    textDecoration: ts?.underline ? 'underline' : undefined,
    fontFamily: ts?.fontFamily ? `"${ts.fontFamily}"` : undefined,
  };

  return (
    <div className={clsx(styles.group, selected && styles.selected)} style={boxStyle}>
      <div
        className={styles.titleBar}
        style={{ height: GROUP_TITLE_HEIGHT }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedGroupId(group.id);
        }}
      >
        <span className={styles.title} style={titleStyle}>
          {group.title}
        </span>
        {selected && (
          <button
            type="button"
            className={styles.del}
            aria-label="delete group"
            onClick={(e) => {
              e.stopPropagation();
              deleteGroup(group.id);
              setSelectedGroupId(null);
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
