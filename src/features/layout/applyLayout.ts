import type { AppNode, AppEdge, LayoutType } from '../../store/types';
import { getLayoutStrategy } from './strategies/registry';

/**
 * Applies auto-layout for the given layout kind via the strategy registry.
 * Moves node positions ONLY — edge handles are never touched (the handle a
 * user dragged from stays on the edge for good), and edges are returned as-is.
 * Each strategy decides which edges drive its geometry (most use tree edges
 * only; flowchart uses all). For 'free' this is an identity pass.
 */
export function applyLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  layoutType: LayoutType,
): { nodes: AppNode[]; edges: AppEdge[] } {
  const strategy = getLayoutStrategy(layoutType);
  return { nodes: strategy.layout(nodes, edges), edges };
}
