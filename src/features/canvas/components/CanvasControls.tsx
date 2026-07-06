import { Controls } from '@xyflow/react';

export function CanvasControls(): React.JSX.Element {
  return (
    <Controls
      showInteractive={false}
      style={{
        background: 'var(--rm-panel)',
        border: '1px solid var(--rm-border-soft)',
        borderRadius: 'var(--rm-radius)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
      }}
    />
  );
}
