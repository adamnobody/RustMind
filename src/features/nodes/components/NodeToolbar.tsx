import { NodeToolbar, Position } from '@xyflow/react';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { useNodeActions } from '../hooks/useNodeActions';
import styles from './NodeToolbar.module.css';

interface MindNodeToolbarProps {
  nodeId: string;
  isRoot: boolean;
  isVisible: boolean;
}

export function MindNodeToolbar({
  nodeId,
  isRoot,
  isVisible,
}: MindNodeToolbarProps): React.JSX.Element {
  const { addChild, addSibling, remove, canAddSibling, canDelete } = useNodeActions({
    nodeId,
    isRoot,
  });

  return (
    <NodeToolbar isVisible={isVisible} position={Position.Top} offset={10} className={styles.toolbar}>
      <IconButton icon="plus" label="Добавить дочерний узел (Tab)" onClick={addChild} />
      {canAddSibling && (
        <IconButton icon="plus-sibling" label="Добавить соседний узел (Enter)" onClick={addSibling} />
      )}
      {canDelete && (
        <IconButton icon="trash" label="Удалить ветку (Delete)" variant="danger" onClick={remove} />
      )}
    </NodeToolbar>
  );
}
