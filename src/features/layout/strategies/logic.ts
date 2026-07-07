import type { LayoutStrategy } from './types';
import { canConnectAsTree, withPositions } from './shared';
import { layoutAxisTree } from './treeGeometry';

// Компактнее right: узкая структурная схема/аутлайн, а не радиальная mind-map.
const LEVEL_GAP = 150;
const SIBLING_GAP = 16;

/**
 * Логическая схема: как right, но компактнее и строже по вертикали — читается
 * как вложенный аутлайн (обоснования/требования/декомпозиция), а не ветвящаяся
 * mind-map.
 */
export const logicStrategy: LayoutStrategy = {
  kind: 'logic',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'bezier',
  blockedReasonKey: 'constraint.logic',
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
