import type { AppEdge } from '../../../store/types';
import type { LayoutStrategy } from './types';
import { findRoot, nodeSize, withPositions } from './shared';

const COLUMN_X = 420; // причины слева, следствия справа
const ROW_GAP = 32;
const ORPHAN_Y = 260;

/**
 * Многопоточная карта: событие (корень) в центре, слева — причины (рёбра,
 * ВХОДЯЩИЕ в событие), справа — следствия (рёбра ИЗ события). Связи обязаны
 * проходить через событие: причина→событие или событие→следствие.
 */
export const multiflowStrategy: LayoutStrategy = {
  kind: 'multiflow',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  blockedReasonKey: 'constraint.multiflow',
  canConnect: (sourceId, targetId, ctx) => {
    if (sourceId === targetId) return false;
    const root = findRoot(ctx.nodes);
    if (!root) return false;
    // Ровно один конец — событие; направление задаёт роль второго конца.
    return sourceId === root.id || targetId === root.id;
  },
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(root.id, { x: 0, y: 0 });

    const causes: string[] = [];
    const effects: string[] = [];
    const seen = new Set<string>([root.id]);
    const classify = (edge: AppEdge): void => {
      if (edge.target === root.id && !seen.has(edge.source)) {
        seen.add(edge.source);
        causes.push(edge.source);
      } else if (edge.source === root.id && !seen.has(edge.target)) {
        seen.add(edge.target);
        effects.push(edge.target);
      }
    };
    edges.forEach(classify);

    const rootH = nodeSize(root).height;
    const stack = (ids: string[], x: number): void => {
      const step = rootH + ROW_GAP;
      const startY = -((ids.length - 1) * step) / 2;
      ids.forEach((id, i) => positions.set(id, { x, y: Math.round(startY + i * step) }));
    };
    stack(causes, -COLUMN_X);
    stack(effects, COLUMN_X);

    // Узлы без связи с событием — стопкой под центром, чтобы не потерялись.
    const orphans = nodes.filter((n) => !seen.has(n.id));
    orphans.forEach((n, i) => {
      positions.set(n.id, { x: 0, y: ORPHAN_Y + i * (rootH + ROW_GAP) });
    });

    return withPositions(nodes, positions);
  },
};
