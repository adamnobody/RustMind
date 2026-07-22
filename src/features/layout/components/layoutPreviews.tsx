import type { AppNode, AppEdge } from '../../../store/types';
import { DEFAULT_NODE_SIZE, ROOT_NODE_SIZE } from '../../../shared/lib/constants';
import { isTreeEdge } from '../../edges/types';
import { resolveEdgeRoute } from '../../edges/lib/resolveRoute';
import { sidePort, type PortSide, type Rect } from '../../edges/lib/routing';
import { getLayoutStrategy } from '../strategies/registry';
import { LAYOUT_KINDS, type LayoutKind } from '../engines/layoutTypes';
import styles from './LayoutTypeDialog.module.css';

/**
 * Мини-схемы для диалога выбора типа карты. Не рисуются вручную: маленький
 * фиксированный граф прогоняется через ТУ ЖЕ стратегию раскладки и тот же
 * resolveEdgeRoute, что и настоящий канвас, а результат просто масштабируется
 * в SVG. Поэтому preview физически не может разойтись с поведением холста —
 * шина оргструктуры, ось таймлайна, хребет fishbone и компактный аутлайн logic
 * видны такими же, какими получатся на карте.
 */

/** Корень + три ветви первого уровня + два потомка — минимум, на котором видна форма. */
const PREVIEW_NODES: AppNode[] = [
  { id: 'R', type: 'mindNode', position: { x: 0, y: 0 }, data: { label: 'R', isRoot: true, order: 0 } },
  { id: 'A', type: 'mindNode', position: { x: 300, y: -140 }, data: { label: 'A', order: 0 } },
  { id: 'B', type: 'mindNode', position: { x: 300, y: 40 }, data: { label: 'B', order: 1 } },
  { id: 'C', type: 'mindNode', position: { x: -320, y: 60 }, data: { label: 'C', order: 2 } },
  { id: 'A1', type: 'mindNode', position: { x: 600, y: -200 }, data: { label: 'A1', order: 0 } },
  { id: 'B1', type: 'mindNode', position: { x: 600, y: 120 }, data: { label: 'B1', order: 0 } },
];

const PREVIEW_EDGES: AppEdge[] = [
  ['R', 'A'],
  ['R', 'B'],
  ['R', 'C'],
  ['A', 'A1'],
  ['B', 'B1'],
].map(([source, target]) => ({
  id: `${source}-${target}`,
  source,
  target,
  sourceHandle: 'right',
  targetHandle: 'left',
  data: { kind: 'tree' as const },
}));

function rectOfNode(node: AppNode): Rect {
  const size = node.data.isRoot === true ? ROOT_NODE_SIZE : DEFAULT_NODE_SIZE;
  return { x: node.position.x, y: node.position.y, width: size.width, height: size.height };
}

/** Все координатные пары пути — для расчёта общей рамки схемы. */
function pathPoints(path: string): { x: number; y: number }[] {
  const nums = path.match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return [];
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push({ x: Number(nums[i]), y: Number(nums[i + 1]) });
  }
  return out;
}

function buildPreview(kind: LayoutKind): React.JSX.Element {
  const strategy = getLayoutStrategy(kind);
  const laid = strategy.layout(PREVIEW_NODES, PREVIEW_EDGES);
  const rects = new Map(laid.map((n) => [n.id, rectOfNode(n)]));
  const rectOf = (id: string): Rect | undefined => rects.get(id);

  const paths = PREVIEW_EDGES.map((edge) => {
    const sourceRect = rects.get(edge.source);
    const targetRect = rects.get(edge.target);
    if (!sourceRect || !targetRect) return '';
    return resolveEdgeRoute({
      geometry: 'auto',
      isTree: isTreeEdge(edge),
      strategy,
      ctx: {
        sourceId: edge.source,
        targetId: edge.target,
        sourceRect,
        targetRect,
        rectOf,
        nodes: laid,
        edges: PREVIEW_EDGES,
      },
      handles: {
        source: sidePort(sourceRect, (edge.sourceHandle ?? 'right') as PortSide),
        target: sidePort(targetRect, (edge.targetHandle ?? 'left') as PortSide),
      },
    }).path;
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const stretch = (x: number, y: number): void => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const r of rects.values()) {
    stretch(r.x, r.y);
    stretch(r.x + r.width, r.y + r.height);
  }
  for (const path of paths) {
    for (const p of pathPoints(path)) stretch(p.x, p.y);
  }

  const pad = 24;
  const width = Math.max(maxX - minX, 1) + pad * 2;
  const height = Math.max(maxY - minY, 1) + pad * 2;

  return (
    <svg
      className={styles.previewSvg}
      viewBox={`${minX - pad} ${minY - pad} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, i) =>
        d === '' ? null : (
          <path
            key={PREVIEW_EDGES[i].id}
            d={d}
            className={styles.previewEdge}
            vectorEffect="non-scaling-stroke"
          />
        ),
      )}
      {laid.map((node) => {
        const r = rects.get(node.id);
        if (!r) return null;
        return (
          <rect
            key={node.id}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            rx={10}
            className={node.data.isRoot === true ? styles.previewRoot : styles.previewNode}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}

export const LAYOUT_PREVIEWS: Record<LayoutKind, React.JSX.Element> = Object.fromEntries(
  LAYOUT_KINDS.map((kind) => [kind, buildPreview(kind)]),
) as Record<LayoutKind, React.JSX.Element>;
