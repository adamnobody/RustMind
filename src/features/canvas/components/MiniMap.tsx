import { MiniMap as FlowMiniMap, type MiniMapNodeProps } from '@xyflow/react';
import type { MindNodeData } from '../../nodes/types';

/** Цвет узла на миникарте: явный фон/цвет узла (hex) или акцент по умолчанию. */
function miniColor(data: MindNodeData | undefined): string {
  const c = data?.style?.backgroundColor ?? data?.color ?? data?.levelColor;
  return typeof c === 'string' && c.startsWith('#') ? c : 'var(--rm-accent)';
}

/** Скруглённые прямоугольники вместо квадратов — под форму реальных узлов. */
function MiniNode({ x, y, width, height, color }: MiniMapNodeProps): React.JSX.Element {
  return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={color} />;
}

export function MiniMap(): React.JSX.Element {
  return (
    <FlowMiniMap
      pannable
      zoomable
      nodeColor={(node) => miniColor(node.data as MindNodeData | undefined)}
      nodeComponent={MiniNode}
      nodeStrokeWidth={0}
      maskColor="var(--rm-minimap-mask)"
      offsetScale={4}
      style={{
        background: 'var(--rm-panel)',
        border: '1px solid var(--rm-border-soft)',
        borderRadius: 'var(--rm-radius)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
      }}
    />
  );
}
