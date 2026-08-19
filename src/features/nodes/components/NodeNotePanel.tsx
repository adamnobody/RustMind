import { ViewportPortal, useInternalNode } from '@xyflow/react';
import clsx from 'clsx';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { useT } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/Icon/Icon';
import styles from './NodeNotePanel.module.css';

interface NodeNotePanelProps {
  nodeId: string;
  note: string;
}

/** Зазор между низом узла и панелью — в координатах холста, зумится вместе с картой. */
const OFFSET = 12;

/**
 * Панель заметки под узлом (XMind-модель). Живёт в ViewportPortal, чтобы
 * размер в пространстве карты не зависел от зума: NodeToolbar порталится
 * в экранные координаты и при отдалении камеры раздувается относительно узлов.
 * Пишет data.note через setNodeNote; закрывается кнопкой ×, удаляется корзиной.
 * Клавиатуру глотаем (stopPropagation), чтобы печать не улетала в хоткеи канваса.
 */
export function NodeNotePanel({ nodeId, note }: NodeNotePanelProps): React.JSX.Element | null {
  const t = useT();
  const setNodeNote = useMindMapStore((s) => s.setNodeNote);
  const toggleNotePanel = useUIStore((s) => s.toggleNotePanel);
  const node = useInternalNode(nodeId);

  const hide = (): void => toggleNotePanel(nodeId);
  const remove = (): void => {
    setNodeNote(nodeId, '');
    toggleNotePanel(nodeId);
  };

  // nodrag/nopan/nowheel — классы RF: ресайз textarea иначе таскает холст.
  const stopPane = (e: React.SyntheticEvent): void => {
    e.stopPropagation();
  };

  if (!node) return null;

  const { x, y } = node.internals.positionAbsolute;
  const height = node.measured.height ?? 0;

  return (
    <ViewportPortal>
      <div
        className={clsx(styles.panel, 'nodrag', 'nopan', 'nowheel')}
        style={{ transform: `translate(${x}px, ${y + height + OFFSET}px)` }}
        onPointerDown={stopPane}
        onMouseDown={stopPane}
      >
        <div className={styles.header} onKeyDown={stopPane}>
          <span className={styles.title}>{t('note.title')}</span>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.delete}`}
              aria-label={t('note.delete')}
              title={t('note.delete')}
              onClick={remove}
            >
              <Icon name="trash" size={13} />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={t('note.hide')}
              title={t('note.hide')}
              onClick={hide}
            >
              ×
            </button>
          </div>
        </div>
        <textarea
          className={styles.textarea}
          value={note}
          placeholder={t('note.placeholder')}
          autoFocus
          onKeyDown={stopPane}
          onChange={(e) => setNodeNote(nodeId, e.target.value)}
        />
      </div>
    </ViewportPortal>
  );
}
