import { useMemo, useCallback, useEffect, type CSSProperties } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
  type FinalConnectionState,
  type Edge,
  type Connection,
  type Node as RFNode,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';

import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { MindNode } from '../../nodes/components/MindNode';
import { MindEdge } from '../../edges/components/MindEdge';
import { MIND_NODE_TYPE } from '../../nodes/types';
import { MIND_EDGE_TYPE, oppositeHandle } from '../../edges/types';
import { getLayoutStrategy, isEdgeValidForLayout } from '../../layout/strategies/registry';
import { resolveDropTarget } from '../lib/dropTarget';

import { useT, translate } from '../../../shared/i18n';
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys';
import { CanvasBackground } from './CanvasBackground';
import { CanvasControls } from './CanvasControls';
import { MiniMap } from './MiniMap';
import styles from './MindMapCanvas.module.css';

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
    moveNode,
    applyAutoLayout,
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
      moveNode: s.moveNode,
      applyAutoLayout: s.applyAutoLayout,
      pushHistory: s.pushHistory,
      markDirty: s.markDirty,
    })),
  );

  const handleVisibility = useMindMapStore((s) => s.projectSettings.handleVisibility);

  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const setSelection = useUIStore((s) => s.setSelection);
  const setEditingEdgeId = useUIStore((s) => s.setEditingEdgeId);
  const editingNodeId = useUIStore((s) => s.editingNodeId);
  const notice = useUIStore((s) => s.notice);
  const settings = useUIStore((s) => s.settings);
  const layoutType = useMindMapStore((s) => s.layoutType);
  const isEditing = editingNodeId !== null;
  const t = useT();
  const canvasStyle = useMemo(
    () =>
      ({
        '--rm-node-font-size': nodeFontSizeBySetting[settings.nodeFontSize],
      }) as CSSProperties,
    [settings.nodeFontSize],
  );

  const nodeTypes = useMemo<NodeTypes>(() => ({ [MIND_NODE_TYPE]: MindNode }), []);
  const edgeTypes = useMemo<EdgeTypes>(() => ({ [MIND_EDGE_TYPE]: MindEdge }), []);

  const strategy = useMemo(() => getLayoutStrategy(layoutType), [layoutType]);

  // Мягкий вариант ограничений: рёбра, невалидные для ТЕКУЩЕЙ раскладки
  // (остались после переключения типа), не удаляются — помечаются флагом
  // data.invalid для визуальной отбраковки в MindEdge. Флаг живёт только в
  // этом производном массиве и никогда не попадает в стор/файл.
  const displayEdges = useMemo(() => {
    if (strategy.edgeConstraint === 'any') return edges;
    return edges.map((e) =>
      isEdgeValidForLayout(strategy, e, nodes, edges)
        ? e
        : { ...e, data: { ...e.data, invalid: true } },
    );
  }, [edges, nodes, strategy]);

  // Жёсткий edgeConstraint на уровне жеста: невалидную связь нельзя даже
  // «защёлкнуть» — RF подсветит хэндл как запрещённый.
  const isValidConnection = useCallback(
    (conn: Edge | Connection) => {
      if (!conn.source || !conn.target) return false;
      const { nodes: n, edges: eds } = useMindMapStore.getState();
      return strategy.canConnect(conn.source, conn.target, { nodes: n, edges: eds });
    },
    [strategy],
  );

  // Двойной клик по ребру — инлайн-редактор подписи (label) на самом ребре.
  const handleEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setEditingEdgeId(edge.id);
    },
    [setEditingEdgeId],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      setSelection(
        selectedNodes.map((n) => n.id),
        selectedEdges.map((e) => e.id),
      );
    },
    [setSelection],
  );

  // Drag from handle → drop on empty canvas → create child node at drop point.
  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (connectionState.isValid || !connectionState.fromNode) return;

      // Отпустили на СУЩЕСТВУЮЩЕМ узле, но isValidConnection забраковал жест —
      // это заблокированная связь, а не «создать потомка в пустоте». Тост с
      // причиной и выходим.
      if (connectionState.toNode) {
        useUIStore.getState().showNotice(
          translate(getLayoutStrategy(useMindMapStore.getState().layoutType).blockedReasonKey),
        );
        return;
      }

      // Экранные координаты точки отпускания (мышь или касание) →
      // координаты потока, чтобы узел появился ровно там, где отпустили.
      const point =
        'changedTouches' in event ? event.changedTouches[0] : (event as MouseEvent);
      const position = screenToFlowPosition({ x: point.clientX, y: point.clientY });

      // Ребро выходит ровно из того хэндла, с которого начат drag — без подмены.
      // Входной хэндл нового узла — противоположный, чтобы линия шла прямо.
      const sourceHandle = connectionState.fromHandle?.id ?? undefined;
      const newId = addChildNode(connectionState.fromNode.id, position, {
        sourceHandle,
        targetHandle: oppositeHandle(sourceHandle),
      });
      if (newId) {
        setSelectedNodeId(newId);
      }
    },
    [addChildNode, screenToFlowPosition, setSelectedNodeId],
  );

  // Drag перемещения узла = одна запись истории: снимок на старте, dirty на финише.
  const handleNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Точка ссылки для drop-резолвера — центр перетаскиваемого узла в flow-
  // координатах (RF уже обновил node.position во время drag).
  const dragPoint = (node: RFNode): { x: number; y: number } => {
    const width = node.measured?.width ?? 0;
    const height = node.measured?.height ?? 0;
    return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
  };

  // XMind-модель: во время drag узла (для derived-раскладок — не network)
  // подсвечиваем, куда он встанет при отпускании — будущий родитель (reparent)
  // или группа сиблингов (reorder). Ничего не сохраняется, чисто визуально.
  const handleNodeDrag = useCallback((_event: unknown, node: RFNode) => {
    const { layoutType } = useMindMapStore.getState();
    if (getLayoutStrategy(layoutType).positionMode !== 'derived') return;
    const { nodes: n, edges: e } = useMindMapStore.getState();
    const resolution = resolveDropTarget(node.id, dragPoint(node), n, e);
    useUIStore.getState().setDragIndicator(resolution.kind === 'none' ? null : resolution);
  }, []);

  // Drop = переприкрепление в структуре, никогда свободное перемещение (кроме
  // network — там drag остаётся свободным, позиции хранятся как есть).
  const handleNodeDragStop = useCallback(
    (_event: unknown, node: RFNode) => {
      useUIStore.getState().setDragIndicator(null);
      const { layoutType } = useMindMapStore.getState();
      if (getLayoutStrategy(layoutType).positionMode === 'derived') {
        const { nodes: n, edges: e } = useMindMapStore.getState();
        const resolution = resolveDropTarget(node.id, dragPoint(node), n, e);
        // pushHistory на старте drag уже снял снимок — здесь своей записи не нужно.
        if (resolution.kind === 'reparent') {
          moveNode(node.id, resolution.parentId, undefined, { skipHistory: true });
        } else if (resolution.kind === 'reorder') {
          moveNode(node.id, resolution.parentId, resolution.index, { skipHistory: true });
        } else {
          // Никуда не попали — узел щёлкает на вычисленную позицию, улететь
          // в пустоту нельзя.
          applyAutoLayout();
        }
      }
      markDirty();
    },
    [moveNode, applyAutoLayout, markDirty],
  );

  return (
    <div data-handle-visibility={handleVisibility} className={styles.wrapper}>
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={handleConnectEnd}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        isValidConnection={isValidConnection}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={handleSelectionChange}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        // Встроенное удаление RF (Backspace) обходит нашу историю undo и
        // isDirty — весь Delete/Backspace обрабатывает useGlobalHotkeys.
        deleteKeyCode={null}
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
      <div className={styles.hint} aria-hidden="true">
        <span className={styles.prompt}>&gt;</span>
        {t('canvas.hint')}
        <span className={styles.cursor}>_</span>
      </div>
      {notice && (
        <div className={styles.notice} role="status">
          {notice}
        </div>
      )}
    </div>
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
