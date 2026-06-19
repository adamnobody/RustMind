import { MiniMap as FlowMiniMap } from '@xyflow/react';

export function MiniMap(): React.JSX.Element {
  return (
    <FlowMiniMap
      pannable
      zoomable
      nodeColor="var(--rm-accent)"
      maskColor="rgba(15, 23, 42, 0.6)"
      style={{
        backgroundColor: 'var(--rm-surface)',
        border: '1px solid var(--rm-border)',
        borderRadius: 'var(--rm-radius-sm)',
      }}
    />
  );
}
