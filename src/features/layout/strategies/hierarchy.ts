import { isTreeEdge } from '../../edges/types';
import { layoutTree } from '../lib/layoutTree';
import type { LayoutStrategy } from './types';
import { canConnectAsTree } from './shared';

/**
 * Схема-иерархия: дерево сверху вниз, корень наверху, дети уровнями (Dagre TB).
 * Связи — только parent→child, без циклов; свободные ассоциации запрещены.
 */
export const hierarchyStrategy: LayoutStrategy = {
  kind: 'hierarchy',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  blockedReasonKey: 'constraint.hierarchy',
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => layoutTree(nodes, edges.filter(isTreeEdge), { direction: 'TB' }),
};
