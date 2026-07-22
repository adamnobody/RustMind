import type { LayoutStrategy } from './types';
import { DEFAULT_NODE_SIZE } from '../../../shared/lib/constants';
import { sidePort } from '../../edges/lib/routing';
import { canConnectAsTree, findRoot, nodeSize, treeChildrenMap, withPositions } from './shared';
import { horizontalBusRoute, LOCAL_BUS_STUB } from './routes';

const LEVEL_GAP = 60; // компактный отступ между уровнями по X (у right — 200)
const ROW_GAP = 18; // зазор между строками аутлайна по Y

/**
 * Логическая схема — вложенный ВЫКЛАДНОЙ АУТЛАЙН, а не ветвящаяся mind-map:
 * - глубина увеличивает X (компактный отступ, вдвое-втрое уже right);
 * - порядок документа (pre-order обхода по data.order) увеличивает Y: узел
 *   стоит В НАЧАЛЕ своего поддерева, а не по центру группы детей, поэтому
 *   поддерево занимает непрерывный вертикальный диапазон, а следующий сиблинг
 *   начинается строго после предыдущего поддерева.
 *
 * Связи — локальные вертикальные шины: из правой грани родителя короткий
 * «носик» вправо, вертикаль вдоль всех его детей, горизонтальные ответвления
 * в левую грань каждого. Все дети одного родителя используют один и тот же X
 * шины, поэтому ветка читается как отступ в аутлайне.
 */
export const logicStrategy: LayoutStrategy = {
  kind: 'logic',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'orthogonal',
  blockedReasonKey: 'constraint.logic',
  routeTreeEdge: ({ sourceRect, targetRect }) => {
    const sp = sidePort(sourceRect, 'right');
    const tp = sidePort(targetRect, 'left');
    // Шина — у правой грани родителя; если ребёнок вплотную, не заходим за него.
    const busX = Math.min(sp.x + LOCAL_BUS_STUB, tp.x);
    return horizontalBusRoute(sp, tp, busX, 0);
  },
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;

    const children = treeChildrenMap(nodes, edges);
    const sizeById = new Map(nodes.map((n) => [n.id, nodeSize(n)]));
    const sizeOf = (id: string): { width: number; height: number } =>
      sizeById.get(id) ?? DEFAULT_NODE_SIZE;

    const positions = new Map<string, { x: number; y: number }>();
    const visited = new Set<string>();
    // Верхняя граница следующей строки аутлайна; корень оказывается в y = 0.
    let nextTop = -sizeOf(root.id).height / 2;

    const visit = (id: string, x: number): void => {
      if (visited.has(id)) return; // защита от циклов в испорченных данных
      visited.add(id);
      const { width, height } = sizeOf(id);
      const y = nextTop + height / 2;
      positions.set(id, { x, y });
      nextTop = y + height / 2 + ROW_GAP;
      for (const kid of children.get(id) ?? []) {
        visit(kid, x + width / 2 + LEVEL_GAP + sizeOf(kid).width / 2);
      }
    };
    visit(root.id, 0);

    return withPositions(nodes, positions);
  },
};
