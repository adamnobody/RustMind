import type { LayoutStrategy } from './types';
import { canConnectAsTree, withPositions } from './shared';
import { leftToRightRoute } from './routes';
import { layoutAxisTree } from './treeGeometry';

const LEVEL_GAP = 200; // расстояние между поколениями по X
const SIBLING_GAP = 30; // зазор между соседними ветвями по Y

/**
 * Право-направленная mind-map: корень слева, поколения растут вправо (X+),
 * сиблинги стопкой по Y, внутренние узлы центрированы между первым и
 * последним потомком.
 */
export const rightStrategy: LayoutStrategy = {
  kind: 'right',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'bezier',
  blockedReasonKey: 'constraint.right',
  // Дерево растёт вправо: выход всегда справа, вход всегда слева.
  routeTreeEdge: ({ sourceRect, targetRect }) => leftToRightRoute(sourceRect, targetRect),
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const positions = layoutAxisTree(nodes, edges, {
      depthAxis: 'x',
      depthSign: 1,
      levelGap: LEVEL_GAP,
      siblingGap: SIBLING_GAP,
    });
    return withPositions(nodes, positions);
  },
};
