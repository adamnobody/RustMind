import { NodeToolbar, Position } from '@xyflow/react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { useT } from '../../../shared/i18n';
import styles from './NodeNotePanel.module.css';

interface NodeNotePanelProps {
  nodeId: string;
  note: string;
}

/**
 * Всплывающая панель заметки под узлом (XMind-модель). Пишет data.note через
 * updateNodeData; закрывается кнопкой ×. Клавиатуру глотаем (stopPropagation),
 * чтобы печать в заметке не улетала в глобальные хоткеи канваса.
 */
export function NodeNotePanel({ nodeId, note }: NodeNotePanelProps): React.JSX.Element {
  const t = useT();
  const setNodeNote = useMindMapStore((s) => s.setNodeNote);
  const toggleNotePanel = useUIStore((s) => s.toggleNotePanel);

  return (
    <NodeToolbar isVisible position={Position.Bottom} offset={12} className={styles.panel}>
      <div className={styles.header} onKeyDown={(e) => e.stopPropagation()}>
        <span className={styles.title}>{t('note.title')}</span>
        <button
          type="button"
          className={styles.close}
          aria-label={t('note.hide')}
          onClick={() => toggleNotePanel(nodeId)}
        >
          ×
        </button>
      </div>
      <textarea
        className={styles.textarea}
        value={note}
        placeholder={t('note.placeholder')}
        autoFocus
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => setNodeNote(nodeId, e.target.value)}
      />
    </NodeToolbar>
  );
}
