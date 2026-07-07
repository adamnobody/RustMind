import type { LayoutStrategy } from './types';
import { canConnectAsTree, findRoot, treeChildrenMap, treeDepth, withPositions } from './shared';

const PAIR_STEP = 240; // шаг пар вдоль моста
const DECK_OFFSET = 110; // отступ элементов пары от линии моста
const FIRST_PAIR_X = 260;
const EXTRA_STEP = 90; // лишние потомки — стопкой ниже партнёра

/**
 * Карта моста: горизонтальный «мост», пары аналогий сверху/снизу (A:B как C:D).
 * Дерево задаёт пары: дети корня — верхняя дорожка, их дети — партнёры снизу.
 * Связи — только внутри пар вдоль моста: древесный предикат + глубина ≤ 2
 * (источник — корень или элемент верхней дорожки).
 */
export const bridgeStrategy: LayoutStrategy = {
  kind: 'bridge',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  blockedReasonKey: 'constraint.bridge',
  canConnect: (sourceId, targetId, ctx) => {
    if (!canConnectAsTree(sourceId, targetId, ctx)) return false;
    // Пара — ровно два яруса над/под мостом: глубже двух уровней моста нет.
    return treeDepth(sourceId, ctx.edges) <= 1;
  },
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;
    const children = treeChildrenMap(edges);
    const positions = new Map<string, { x: number; y: number }>();

    // Корень — «устой» моста слева, на линии моста (y = 0).
    positions.set(root.id, { x: 0, y: 0 });

    const topItems = children.get(root.id) ?? [];
    topItems.forEach((topId, i) => {
      const x = FIRST_PAIR_X + i * PAIR_STEP;
      positions.set(topId, { x, y: -DECK_OFFSET });
      // Партнёры пары — под мостом; несколько детей складываются стопкой вниз.
      (children.get(topId) ?? []).forEach((bottomId, j) => {
        if (positions.has(bottomId)) return;
        positions.set(bottomId, { x, y: DECK_OFFSET + j * EXTRA_STEP });
      });
    });

    return withPositions(nodes, positions);
  },
};
