import { useMemo, useCallback, useEffect, type CSSProperties } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
  type FinalConnectionState,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';

import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { MindNode } from '../../nodes/components/MindNode';
import { MindEdge } from '../../edges/components/MindEdge';
import { MIND_NODE_TYPE } from '../../nodes/types';
import { MIND_EDGE_TYPE } from '../../edges/types';

import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys';
import { CanvasBackground } from './CanvasBackground';
import { CanvasControls } from './CanvasControls';
import { MiniMap } from './MiniMap';

const nodeFontSizeBySetting = {
  s: 'var(--rm-font-sm)',
  m: 'var(--rm-font-md)',
  l: 'var(--rm-font-lg)',
} as const;

function CanvasInner(): React.JSX.Element {
  useGlobalHotkeys();

  const { fitView, screenToFlowPosition } = useReactFlow();
  const registerFitView = useUIStore((s) => s.registerFitView);

  // Register fitView in UIStore so toolbar can call it from outside
  useEffect(() => {
    registerFitView(() => {
      fitView({ padding: 0.1, duration: 300 });
    });
  }, [fitView, registerFitView]);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addChildNode,
    pushHistory,
    markDirty,
  } = useMindMapStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
      addChildNode: s.addChildNode,
      pushHistory: s.pushHistory,
      markDirty: s.markDirty,
    })),
  );

  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const setEditingNodeId = useUIStore((s) => s.setEditingNodeId);
  const editingNodeId = useUIStore((s) => s.editingNodeId);
  const settings = useUIStore((s) => s.settings);
  const isEditing = editingNodeId !== null;
  const canvasStyle = useMemo(
    () =>
      ({
        '--rm-node-font-size': nodeFontSizeBySetting[settings.nodeFontSize],
      }) as CSSProperties,
    [settings.nodeFontSize],
  );

  const nodeTypes = useMemo<NodeTypes>(() => ({ [MIND_NODE_TYPE]: MindNode }), []);
  const edgeTypes = useMemo<EdgeTypes>(() => ({ [MIND_EDGE_TYPE]: MindEdge }), []);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      setSelectedNodeId(selectedNodes[0]?.id ?? null);
    },
    [setSelectedNodeId],
  );

  // Drag from handle → drop on empty canvas → create child node at drop point.
  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (connectionState.isValid || !connectionState.fromNode) return;

      // Экранные координаты точки отпускания (мышь или касание) →
      // координаты потока, чтобы узел появился ровно там, где отпустили.
      const point =
        'changedTouches' in event ? event.changedTouches[0] : (event as MouseEvent);
      const position = screenToFlowPosition({ x: point.clientX, y: point.clientY });

      const newId = addChildNode(connectionState.fromNode.id, position);
      if (newId) {
        setSelectedNodeId(newId);
        setEditingNodeId(newId, { mode: 'edit' });
      }
    },
    [addChildNode, screenToFlowPosition, setSelectedNodeId, setEditingNodeId],
  );

  // Drag перемещения узла = одна запись истории: снимок на старте, dirty на финише.
  const handleNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const handleNodeDragStop = useCallback(() => {
    markDirty();
  }, [markDirty]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onConnectEnd={handleConnectEnd}
      onNodeDragStart={handleNodeDragStart}
      onNodeDragStop={handleNodeDragStop}
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
      style={canvasStyle}
    >
      {settings.showGrid && <CanvasBackground />}
      {settings.showControls && <CanvasControls />}
      {settings.showMiniMap && <MiniMap />}
    </ReactFlow>
  );
}

/** Wrapper with ReactFlowProvider - required for context access */
export function MindMapCanvas(): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
