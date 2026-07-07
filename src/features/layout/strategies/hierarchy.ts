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
  positionMode: 'derived',
  edgeRouting: 'bezier',
  blockedReasonKey: 'constraint.hierarchy',
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const orderOf = new Map(nodes.map((n) => [n.id, n.data.order]));
    // Порядок рёбер, переданных в Dagre, задаёт затравку его ordering-прохода —
    // сортируем по order ребёнка, чтобы сиблинги легли в drag-переставленном
    // порядке, а не в порядке создания.
    const treeEdges = edges
      .filter(isTreeEdge)
      .slice()
      .sort((a, b) => (orderOf.get(a.target) ?? 0) - (orderOf.get(b.target) ?? 0));
    return layoutTree(nodes, treeEdges, { direction: 'TB' });
  },
};
