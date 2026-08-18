import { NodeToolbar, Position } from '@xyflow/react';
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

/**
 * Всплывающая панель заметки под узлом (XMind-модель). Пишет data.note через
 * setNodeNote; закрывается кнопкой ×, удаляется корзиной. Клавиатуру глотаем
 * (stopPropagation), чтобы печать в заметке не улетала в глобальные хоткеи канваса.
 */
export function NodeNotePanel({ nodeId, note }: NodeNotePanelProps): React.JSX.Element {
  const t = useT();
  const setNodeNote = useMindMapStore((s) => s.setNodeNote);
  const toggleNotePanel = useUIStore((s) => s.toggleNotePanel);

  const hide = (): void => toggleNotePanel(nodeId);
  const remove = (): void => {
    setNodeNote(nodeId, '');
    toggleNotePanel(nodeId);
  };

  // nodrag/nopan/nowheel — классы RF: ресайз textarea иначе таскает холст.
  // align=start: ширина растёт вправо, панель не прыгает из-за центрирования.
  const stopPane = (e: React.SyntheticEvent): void => {
    e.stopPropagation();
  };

  return (
    <NodeToolbar
      isVisible
      position={Position.Bottom}
      align="start"
      offset={12}
      className={clsx(styles.panel, 'nodrag', 'nopan', 'nowheel')}
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
    </NodeToolbar>
  );
}
