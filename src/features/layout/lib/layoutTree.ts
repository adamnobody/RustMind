import dagre from 'dagre';
import type { AppNode, AppEdge } from '../../../store/types';
import { DEFAULT_NODE_SIZE, ROOT_NODE_SIZE, LAYOUT_SPACING } from '../../../shared/lib/constants';

export type LayoutDirection = 'LR' | 'TB';

export interface LayoutOptions {
  direction: LayoutDirection;
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Pure layout function using Dagre.
 * Accepts React Flow nodes/edges, returns nodes with computed positions.
 * No side effects, no store access.
 */
export function layoutTree(
  nodes: AppNode[],
  edges: AppEdge[],
  options: LayoutOptions,
): AppNode[] {
  if (nodes.length === 0) return nodes;

  const {
    direction,
    rankSep = LAYOUT_SPACING.rankSep,
    nodeSep = LAYOUT_SPACING.nodeSep,
  } = options;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: rankSep, nodesep: nodeSep });

  for (const node of nodes) {
    const fallback = node.data.isRoot ? ROOT_NODE_SIZE : DEFAULT_NODE_SIZE;
    const w = (node.measured?.width ?? node.width) ?? fallback.width;
    const h = (node.measured?.height ?? node.height) ?? fallback.height;
    g.setNode(node.id, { width: w, height: h });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;

    const fallback = node.data.isRoot ? ROOT_NODE_SIZE : DEFAULT_NODE_SIZE;
    const w = (node.measured?.width ?? node.width) ?? fallback.width;
    const h = (node.measured?.height ?? node.height) ?? fallback.height;

    return {
      ...node,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    };
  });
}
