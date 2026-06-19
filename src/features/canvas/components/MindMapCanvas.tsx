import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';

import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { MindNode } from '../../nodes/components/MindNode';
import { MindEdge } from '../../edges/components/MindEdge';
import { MIND_NODE_TYPE } from '../../nodes/types';
import { MIND_EDGE_TYPE } from '../../edges/types';

import { CanvasBackground } from './CanvasBackground';
import { CanvasControls } from './CanvasControls';
import { MiniMap } from './MiniMap';

function CanvasInner(): React.JSX.Element {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useMindMapStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
    })),
  );

  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const editingNodeId = useUIStore((s) => s.editingNodeId);
  const isEditing = editingNodeId !== null;

  // Регистрация кастомных типов (мемоизация обязательна для производительности)
  const nodeTypes = useMemo<NodeTypes>(() => ({ [MIND_NODE_TYPE]: MindNode }), []);
  const edgeTypes = useMemo<EdgeTypes>(() => ({ [MIND_EDGE_TYPE]: MindEdge }), []);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      setSelectedNodeId(selectedNodes[0]?.id ?? null);
    },
    [setSelectedNodeId],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onSelectionChange={handleSelectionChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: MIND_EDGE_TYPE }}
      nodesDraggable={!isEditing}
      panOnDrag={!isEditing}
    >
      <CanvasBackground />
      <CanvasControls />
      <MiniMap />
    </ReactFlow>
  );
}

/** Обёртка с ReactFlowProvider — обязательна для доступа к контексту */
export function MindMapCanvas(): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
