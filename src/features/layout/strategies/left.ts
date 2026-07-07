import type { LayoutStrategy } from './types';
import { canConnectAsTree, withPositions } from './shared';
import { layoutAxisTree } from './treeGeometry';

const LEVEL_GAP = 200; // расстояние между поколениями по X
const SIBLING_GAP = 30; // зазор между соседними ветвями по Y

/** Зеркало right: корень справа, поколения растут влево (X-). */
export const leftStrategy: LayoutStrategy = {
  kind: 'left',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'bezier',
  blockedReasonKey: 'constraint.left',
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const positions = layoutAxisTree(nodes, edges, {
      depthAxis: 'x',
      depthSign: -1,
      levelGap: LEVEL_GAP,
      siblingGap: SIBLING_GAP,
    });
    return withPositions(nodes, positions);
  },
};
