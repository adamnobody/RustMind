import type { CSSProperties } from 'react';
import { Handle, Position } from '@xyflow/react';
import { DEFAULT_HANDLE_OFFSET, type HandleOffsets, type HandleSide } from '../types';

/**
 * Four connection handles — one per side. All handles are type="source" with
 * connectionMode="loose" on the canvas, which allows any handle to receive
 * incoming connections as well (source-to-source). This enables free-form
 * associative links in addition to the structural tree edges.
 *
 * Edge attachment is driven entirely by explicit sourceHandle/targetHandle ids
 * on each edge (these handle ids: top/right/bottom/left). Tree edges get handles
 * matching the layout direction (set in the store / applyLayout); free edges keep
 * the handles from the user's drag. ReactFlow ignores node sourcePosition once
 * explicit <Handle> components exist, so we don't rely on it.
 *
 * Per-node `offsets` move a handle along its side (percent, 50 = centre).
 * Only the axis coordinate is overridden — ReactFlow's own transform keeps the
 * handle centred on the node border. MindNode calls updateNodeInternals after
 * offsets change so edges re-route to the measured positions.
 *
 * Visual state (hidden / dashed / always) is controlled by the
 * data-handle-visibility attribute on the canvas wrapper — see
 * reactflow-overrides.css for the CSS rules.
 */
function offsetStyle(side: HandleSide, offsets: HandleOffsets | undefined): CSSProperties | undefined {
  const value = offsets?.[side];
  if (value === undefined || value === DEFAULT_HANDLE_OFFSET) return undefined;
  return side === 'top' || side === 'bottom' ? { left: `${value}%` } : { top: `${value}%` };
}

interface NodeHandlesProps {
  offsets?: HandleOffsets;
}

export function NodeHandles({ offsets }: NodeHandlesProps): React.JSX.Element {
  return (
    <>
      <Handle id="top" type="source" position={Position.Top} style={offsetStyle('top', offsets)} />
      <Handle id="right" type="source" position={Position.Right} style={offsetStyle('right', offsets)} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={offsetStyle('bottom', offsets)} />
      <Handle id="left" type="source" position={Position.Left} style={offsetStyle('left', offsets)} />
    </>
  );
}
