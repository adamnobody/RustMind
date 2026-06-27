import type { AppNode, AppEdge, LayoutType } from '../../store/types';
import { isTreeEdge } from '../edges/types';
import { layoutTree, type LayoutDirection } from './lib/layoutTree';

/** Направление раскладки по типу. 'radial' пока не реализован → LR. */
export function directionForLayout(layoutType: LayoutType): LayoutDirection {
  return layoutType === 'tree-TB' ? 'TB' : 'LR';
}

/**
 * Applies auto-layout based on the layout type. Moves node positions ONLY —
 * edge handles are never touched. The handle a user dragged from (or the
 * creation default) stays on the edge for good. Free edges don't drive the
 * tree geometry, so they're excluded from the Dagre input.
 */
export function applyLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  layoutType: LayoutType,
): { nodes: AppNode[]; edges: AppEdge[] } {
  const direction = directionForLayout(layoutType);

  // Dagre строит раскладку дерева — скармливаем только структурные рёбра.
  // Free-связи (циклы, несколько входящих) исказили бы геометрию дерева.
  const treeEdges = edges.filter(isTreeEdge);
  const laidOutNodes = layoutTree(nodes, treeEdges, { direction });

  // Рёбра возвращаем как есть: позиции узлов изменились, хэндлы — нет.
  return { nodes: laidOutNodes, edges };
}
