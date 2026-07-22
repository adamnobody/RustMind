import type { LayoutStrategy } from './types';
import { DEFAULT_NODE_SIZE } from '../../../shared/lib/constants';
import { canConnectAsTree, findRoot, treeChildrenMap, nodeSize, withPositions } from './shared';
import { leftToRightRoute, rightToLeftRoute } from './routes';
import { rectCenter } from '../../edges/lib/routing';
import { buildSpans, placeSubtree } from './treeGeometry';

const LEVEL_GAP = 200;
const SIBLING_GAP = 30;

/**
 * Двусторонняя mind-map (XMind-style): корень в центре, дети первого уровня
 * чередуются право/лево по чётности индекса (order) — детерминированное и
 * стабильное разбиение. Каждая сторона — независимое горизонтальное дерево
 * (та же геометрия, что right/left); потомки остаются на стороне своей ветви
 * первого уровня. Обе стороны центрированы вокруг root.y независимо.
 */
export const bothStrategy: LayoutStrategy = {
  kind: 'both',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'bezier',
  blockedReasonKey: 'constraint.both',
  // Сторона ветви решает направление: правая половина растёт вправо, левая — влево.
  routeTreeEdge: ({ sourceRect, targetRect }) =>
    rectCenter(targetRect).x >= rectCenter(sourceRect).x
      ? leftToRightRoute(sourceRect, targetRect)
      : rightToLeftRoute(sourceRect, targetRect),
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(root.id, { x: 0, y: 0 });

    const children = treeChildrenMap(nodes, edges);
    const kids = children.get(root.id) ?? [];
    const sizeById = new Map(nodes.map((n) => [n.id, nodeSize(n)]));
    const widthOf = (id: string): number => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).width;
    const heightOf = (id: string): number => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).height;
    const rootWidth = widthOf(root.id);

    const placeSide = (sideKids: string[], depthSign: 1 | -1): void => {
      if (sideKids.length === 0) return;
      const spans = new Map<string, number>();
      for (const kid of sideKids) {
        for (const [id, span] of buildSpans(kid, children, heightOf, SIBLING_GAP)) {
          spans.set(id, span);
        }
      }
      const total = sideKids.reduce(
        (sum, k, i) => sum + (spans.get(k) ?? heightOf(k)) + (i > 0 ? SIBLING_GAP : 0),
        0,
      );
      let cursor = -total / 2;
      for (const kid of sideKids) {
        const span = spans.get(kid) ?? heightOf(kid);
        const centerY = cursor + span / 2;
        const kidPrimary = depthSign * (rootWidth / 2 + LEVEL_GAP + widthOf(kid) / 2);
        placeSubtree(
          kid,
          kidPrimary,
          centerY,
          children,
          spans,
          widthOf,
          heightOf,
          { depthAxis: 'x', depthSign, levelGap: LEVEL_GAP, siblingGap: SIBLING_GAP },
          positions,
        );
        cursor += span + SIBLING_GAP;
      }
    };

    // Чередование по индексу: 0,2,4… → вправо; 1,3,5… → влево.
    placeSide(kids.filter((_, i) => i % 2 === 0), 1);
    placeSide(kids.filter((_, i) => i % 2 !== 0), -1);

    return withPositions(nodes, positions);
  },
};
