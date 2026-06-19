import { MiniMap as FlowMiniMap } from '@xyflow/react';

export function MiniMap(): React.JSX.Element {
  return (
    <FlowMiniMap
      pannable
      zoomable
      nodeColor="var(--rm-accent)"
      maskColor="var(--rm-minimap-mask)"
      style={{
        backgroundColor: 'var(--rm-surface)',
        border: '1px solid var(--rm-border)',
        borderRadius: 'var(--rm-radius)',
        boxShadow: 'var(--rm-shadow-sm)',
      }}
    />
  );
}
