import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

export function MindEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps): React.JSX.Element {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{ stroke: 'var(--rm-edge)', strokeWidth: 2 }}
    />
  );
}
