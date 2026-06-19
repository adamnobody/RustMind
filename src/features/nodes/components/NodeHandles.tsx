import { Handle, Position } from '@xyflow/react';

interface NodeHandlesProps {
  isRoot?: boolean;
}

/**
 * Хэндлы соединений. Source (исходящий) — справа, Target (входящий) — слева.
 * Для горизонтального layout (tree-LR). На шаге 8 свяжем с направлением layout.
 */
export function NodeHandles({ isRoot }: NodeHandlesProps): React.JSX.Element {
  return (
    <>
      {/* Корень не имеет входящего хэндла, остальные имеют */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: 'var(--rm-edge)', border: 'none' }}
        />
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'var(--rm-edge)', border: 'none' }}
      />
    </>
  );
}
