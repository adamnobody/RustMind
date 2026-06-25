import type { AppNode, AppEdge, LayoutType } from '../../store/types';
import { layoutTree } from './lib/layoutTree';

/**
 * Applies auto-layout to nodes and edges based on the layout type.
 * Returns new nodes with recalculated positions.
 */
export function applyLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  layoutType: LayoutType,
): { nodes: AppNode[]; edges: AppEdge[] } {
  // 'radial' not yet implemented, fall back to LR
  const direction = layoutType === 'tree-TB' ? 'TB' : 'LR';
  const laidOutNodes = layoutTree(nodes, edges, { direction });
  return { nodes: laidOutNodes, edges };
}
