import type { LayoutStrategy } from './types';
import { canConnectAsTree, withPositions } from './shared';
import { layoutAxisTree } from './treeGeometry';

const LEVEL_GAP = 140; // расстояние между поколениями по Y
const SIBLING_GAP = 50; // зазор между соседними ветвями по X

/**
 * Оргструктура: корень наверху, поколения растут вниз (Y+), сиблинги в ряд
 * по X, внутренние узлы центрированы над своей группой потомков.
 */
export const orgStrategy: LayoutStrategy = {
  kind: 'org',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'orthogonal',
  blockedReasonKey: 'constraint.org',
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const positions = layoutAxisTree(nodes, edges, {
      depthAxis: 'y',
      depthSign: 1,
      levelGap: LEVEL_GAP,
      siblingGap: SIBLING_GAP,
    });
    return withPositions(nodes, positions);
  },
};
