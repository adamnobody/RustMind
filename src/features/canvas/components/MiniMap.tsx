import { MiniMap as FlowMiniMap } from '@xyflow/react';

export function MiniMap(): React.JSX.Element {
  return (
    <FlowMiniMap
      pannable
      zoomable
      nodeColor="var(--rm-accent)"
      maskColor="var(--rm-minimap-mask)"
      style={{
        background: 'var(--rm-panel)',
        border: '1px solid var(--rm-border-soft)',
        borderRadius: 'var(--rm-radius)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
      }}
    />
  );
}
