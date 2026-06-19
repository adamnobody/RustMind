import { memo, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import { NodeHandles } from './NodeHandles';
import { NodeEditor } from './NodeEditor';
import { MindNodeToolbar } from './NodeToolbar';
import { useNodeEditing } from '../hooks/useNodeEditing';
import type { MindNodeData } from '../types';
import styles from './MindNode.module.css';

function MindNodeComponent({
  id,
  data,
  selected,
}: NodeProps): React.JSX.Element {
  const isRoot = Boolean(data.isRoot);
  const nodeData = data as unknown as MindNodeData;

  const {
    isEditing,
    draft,
    textareaRef,
    startEditing,
    onChange,
    commit,
    onKeyDown,
  } = useNodeEditing({ nodeId: id, initialLabel: nodeData.label });

  // Двойной клик → вход в редактирование
  const handleDoubleClick = useCallback(() => {
    startEditing();
  }, [startEditing]);

  const showToolbar = Boolean(selected) && !isEditing;

  return (
    <div
      className={clsx(
        styles.node,
        isRoot && styles.root,
        selected && styles.selected,
        isEditing && styles.editing,
      )}
      style={{
        backgroundColor: nodeData.color ?? undefined,
        color: nodeData.textColor ?? undefined,
      }}
      onDoubleClick={handleDoubleClick}
    >
      <MindNodeToolbar nodeId={id} isRoot={isRoot} isVisible={showToolbar} />
      <NodeHandles isRoot={isRoot} />
      {isEditing ? (
        <NodeEditor
          value={draft}
          textareaRef={textareaRef}
          onChange={onChange}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      ) : (
        <span className={styles.label}>{nodeData.label}</span>
      )}
    </div>
  );
}

export const MindNode = memo(MindNodeComponent);
