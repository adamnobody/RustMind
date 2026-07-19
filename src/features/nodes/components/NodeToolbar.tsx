import { NodeToolbar, Position } from '@xyflow/react';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { useT } from '../../../shared/i18n';
import { useUIStore } from '../../../store/uiStore';
import { useNodeActions } from '../hooks/useNodeActions';
import styles from './NodeToolbar.module.css';

interface MindNodeToolbarProps {
  nodeId: string;
  isRoot: boolean;
  isVisible: boolean;
  hasNote: boolean;
}

export function MindNodeToolbar({
  nodeId,
  isRoot,
  isVisible,
  hasNote,
}: MindNodeToolbarProps): React.JSX.Element {
  const t = useT();
  const toggleNotePanel = useUIStore((s) => s.toggleNotePanel);
  const { addChild, addSibling, remove, canAddSibling, canDelete } = useNodeActions({
    nodeId,
    isRoot,
  });

  return (
    <NodeToolbar isVisible={isVisible} position={Position.Top} offset={10} className={styles.toolbar}>
      <IconButton icon="plus" label={t('nodeToolbar.addChild')} onClick={addChild} />
      {canAddSibling && (
        <IconButton
          icon="plus-sibling"
          label={t('nodeToolbar.addSibling')}
          onClick={addSibling}
        />
      )}
      <IconButton
        icon="note"
        label={hasNote ? t('nodeToolbar.editNote') : t('nodeToolbar.addNote')}
        onClick={() => toggleNotePanel(nodeId)}
      />
      {canDelete && (
        <IconButton
          icon="trash"
          label={t('nodeToolbar.deleteBranch')}
          variant="danger"
          onClick={remove}
        />
      )}
    </NodeToolbar>
  );
}
