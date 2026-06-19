import { Background, BackgroundVariant } from '@xyflow/react';

export function CanvasBackground(): React.JSX.Element {
  return (
    <Background
      variant={BackgroundVariant.Dots}
      gap={20}
      size={1}
      color="var(--rm-grid)"
    />
  );
}
