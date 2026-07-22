import type { LayoutStrategy } from './types';
import { sidePort } from '../../edges/lib/routing';
import { canConnectAsTree, withPositions } from './shared';
import { siblingBusY, verticalBusRoute } from './routes';
import { layoutAxisTree } from './treeGeometry';

const LEVEL_GAP = 140; // расстояние между поколениями по Y
const SIBLING_GAP = 50; // зазор между соседними ветвями по X

/**
 * Оргструктура: корень наверху, поколения растут вниз (Y+), сиблинги в ряд
 * по X, внутренние узлы центрированы над своей группой потомков.
 *
 * Связи — классическая оргсхема: из нижнего центра руководителя вниз до ОБЩЕЙ
 * горизонтальной шины группы, по шине вбок, затем вертикально в верхний центр
 * каждого подчинённого. Шина не хранится: её Y выводится из прямоугольников
 * родителя и всей группы детей (см. siblingBusY), поэтому все рёбра группы
 * рисуют один и тот же отрезок и визуально сливаются в одну шину.
 */
export const orgStrategy: LayoutStrategy = {
  kind: 'org',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'orthogonal',
  blockedReasonKey: 'constraint.org',
  routeTreeEdge: (ctx) =>
    verticalBusRoute(
      sidePort(ctx.sourceRect, 'bottom'),
      sidePort(ctx.targetRect, 'top'),
      siblingBusY(ctx),
      0, // резкие углы — оргсхема, а не скруглённая mind-map
    ),
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
