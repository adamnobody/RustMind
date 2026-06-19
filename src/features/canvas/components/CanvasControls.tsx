import { Controls } from '@xyflow/react';

export function CanvasControls(): React.JSX.Element {
  return (
    <Controls
      showInteractive={false}
      style={{
        backgroundColor: 'var(--rm-surface)',
        border: '1px solid var(--rm-border)',
        borderRadius: 'var(--rm-radius-sm)',
      }}
    />
  );
}
