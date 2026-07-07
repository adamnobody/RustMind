import type { LayoutStrategy } from './types';
import { canConnectAsTree, findRoot, treeChildrenMap, withPositions } from './shared';

const RING_STEP = 280; // расстояние между кольцами уровней

/**
 * Радиальное дерево: корень в центре, ветви расходятся по кольцам уровней.
 * Угловой сектор каждой ветви пропорционален числу её листьев. Ограничения —
 * как у hierarchy (только parent→child, без циклов), геометрия радиальная.
 */
export const radialTreeStrategy: LayoutStrategy = {
  kind: 'tree',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  blockedReasonKey: 'constraint.tree',
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;
    const children = treeChildrenMap(edges);
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(root.id, { x: 0, y: 0 });

    // Число листьев поддерева — вес углового сектора ветви.
    const leafCount = (id: string, seen: Set<string>): number => {
      if (seen.has(id)) return 0;
      seen.add(id);
      const kids = children.get(id) ?? [];
      if (kids.length === 0) return 1;
      let sum = 0;
      for (const kid of kids) sum += leafCount(kid, seen);
      return Math.max(sum, 1);
    };

    const place = (id: string, level: number, a0: number, a1: number, seen: Set<string>): void => {
      if (seen.has(id)) return;
      seen.add(id);
      if (level > 0) {
        const mid = (a0 + a1) / 2;
        const radius = level * RING_STEP;
        positions.set(id, {
          x: Math.round(radius * Math.cos(mid)),
          y: Math.round(radius * Math.sin(mid)),
        });
      }
      const kids = children.get(id) ?? [];
      if (kids.length === 0) return;
      const weights = kids.map((kid) => leafCount(kid, new Set(seen)));
      const total = weights.reduce((s, w) => s + w, 0) || 1;
      let angle = a0;
      kids.forEach((kid, i) => {
        const span = ((a1 - a0) * weights[i]) / total;
        place(kid, level + 1, angle, angle + span, seen);
        angle += span;
      });
    };

    place(root.id, 0, -Math.PI / 2, (3 * Math.PI) / 2, new Set());
    return withPositions(nodes, positions);
  },
};
