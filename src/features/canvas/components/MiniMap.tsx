import { useMemo } from 'react';
import {
  MiniMap as FlowMiniMap,
  Panel,
  useStore,
  getNodesBounds,
  type MiniMapNodeProps,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import type { MindNodeData } from '../../nodes/types';
import type { AppEdge, AppNode } from '../../../store/types';
import { useMindMapStore } from '../../../store/mindMapStore';
import { collapsedHiddenIds } from '../../layout/strategies/shared';
import { DEFAULT_NODE_SIZE, ROOT_NODE_SIZE } from '../../../shared/lib/constants';

/** Совпадает с размером SVG встроенной FlowMiniMap (её дефолт, style width/height не задаём). */
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const OFFSET_SCALE = 4;

function miniColor(data: MindNodeData | undefined): string {
  const c = data?.style?.backgroundColor ?? data?.color ?? data?.levelColor;
  return typeof c === 'string' && c.startsWith('#') ? c : 'var(--rm-accent)';
}

/** Скруглённые прямоугольники вместо квадратов — под форму реальных узлов. */
function MiniNode({ x, y, width, height, color }: MiniMapNodeProps): React.JSX.Element {
  return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={color} />;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

function nodeCenter(node: AppNode): { x: number; y: number } {
  const fallback = node.data.isRoot ? ROOT_NODE_SIZE : DEFAULT_NODE_SIZE;
  const width = node.measured?.width ?? fallback.width;
  const height = node.measured?.height ?? fallback.height;
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
}

/**
 * @xyflow/react не рисует edges в MiniMap — рисуем их сами, отдельным Panel в
 * ТОЙ ЖЕ позиции (bottom-right, тот же дефолтный margin 15px из библиотечного
 * CSS), поверх встроенной миникарты. viewBox считаем ТОЙ ЖЕ формулой, что и
 * встроенный MiniMap (bounds узлов ∪ текущий viewport + offsetScale), иначе
 * линии разъедутся с узлами библиотечной миникарты.
 */
function MiniMapEdges({ nodes, edges }: { nodes: AppNode[]; edges: AppEdge[] }): React.JSX.Element | null {
  const { transform, width, height } = useStore(
    useShallow((s) => ({ transform: s.transform, width: s.width, height: s.height })),
  );

  const viewBox = useMemo(() => {
    const zoom = transform[2] || 1;
    const viewBB: Rect = {
      x: -transform[0] / zoom,
      y: -transform[1] / zoom,
      width: width / zoom,
      height: height / zoom,
    };
    const bounds = nodes.length > 0 ? unionRect(getNodesBounds(nodes), viewBB) : viewBB;
    const scale = Math.max(bounds.width / MINIMAP_WIDTH, bounds.height / MINIMAP_HEIGHT);
    const boxWidth = scale * MINIMAP_WIDTH;
    const boxHeight = scale * MINIMAP_HEIGHT;
    const pad = OFFSET_SCALE * scale;
    const x = bounds.x - (boxWidth - bounds.width) / 2 - pad;
    const y = bounds.y - (boxHeight - bounds.height) / 2 - pad;
    return `${x} ${y} ${boxWidth + 2 * pad} ${boxHeight + 2 * pad}`;
  }, [nodes, transform, width, height]);

  if (edges.length === 0) return null;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <Panel position="bottom-right" style={{ pointerEvents: 'none' }}>
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} viewBox={viewBox} aria-hidden>
        {edges.map((e) => {
          const source = byId.get(e.source);
          const target = byId.get(e.target);
          if (!source || !target) return null;
          const a = nodeCenter(source);
          const b = nodeCenter(target);
          return (
            <line
              key={e.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--rm-edge)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              opacity={0.6}
            />
          );
        })}
      </svg>
    </Panel>
  );
}

export function MiniMap(): React.JSX.Element {
  const { nodes, edges } = useMindMapStore(useShallow((s) => ({ nodes: s.nodes, edges: s.edges })));
  const collapseHidden = useMemo(() => collapsedHiddenIds(nodes, edges), [nodes, edges]);
  const visibleNodes = useMemo(
    () => nodes.filter((n) => !collapseHidden.has(n.id)),
    [nodes, collapseHidden],
  );
  const visibleEdges = useMemo(
    () => edges.filter((e) => !collapseHidden.has(e.source) && !collapseHidden.has(e.target)),
    [edges, collapseHidden],
  );

  return (
    <>
      <FlowMiniMap
        pannable
        zoomable
        nodeColor={(node) => miniColor(node.data as MindNodeData | undefined)}
        nodeComponent={MiniNode}
        nodeStrokeWidth={0}
        maskColor="var(--rm-minimap-mask)"
        offsetScale={OFFSET_SCALE}
        style={{
          background: 'var(--rm-panel)',
          border: '1px solid var(--rm-border-soft)',
          borderRadius: 'var(--rm-radius)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
        }}
      />
      <MiniMapEdges nodes={visibleNodes} edges={visibleEdges} />
    </>
  );
}
