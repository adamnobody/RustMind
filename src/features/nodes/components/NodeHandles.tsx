import { Handle, Position } from '@xyflow/react';

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
 * Visual state (hidden / dashed / always) is controlled by the
 * data-handle-visibility attribute on the canvas wrapper — see
 * reactflow-overrides.css for the CSS rules.
 */
export function NodeHandles(): React.JSX.Element {
  return (
    <>
      <Handle id="top" type="source" position={Position.Top} />
      <Handle id="right" type="source" position={Position.Right} />
      <Handle id="bottom" type="source" position={Position.Bottom} />
      <Handle id="left" type="source" position={Position.Left} />
    </>
  );
}
