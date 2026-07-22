import type { LayoutStrategy } from './types';
import { DEFAULT_NODE_SIZE } from '../../../shared/lib/constants';
import { CORNER_RADIUS, rectCenter, sidePort } from '../../edges/lib/routing';
import { canConnectAsTree, findRoot, treeChildrenMap, nodeSize, withPositions } from './shared';
import { axisBranchRoute, axisY, isAbove, verticalBusRoute } from './routes';
import { buildSpans, placeSubtree } from './treeGeometry';

/** Вынос события от временной оси по Y (одинаков для всех событий). */
export const TIMELINE_AXIS_GAP = 130;
const AXIS_START = 90; // отступ первого события от правой грани корня
const EVENT_GAP = 60; // зазор между слотами соседних событий вдоль оси
const DETAIL_LEVEL_GAP = 90; // шаг вложенных узлов события прочь от оси
const DETAIL_SIBLING_GAP = 28; // зазор между соседними вложенными узлами по X

/**
 * Настоящий таймлайн (НЕ Dagre с другим rankdir и не оргструктура):
 * - начало (корень) — слева, его центр задаёт единую горизонтальную ось;
 * - дети первого уровня — события, разложены слева направо по data.order:
 *   каждое занимает слот шириной со своё поддерево, поэтому порядок вдоль оси
 *   визуально однозначен и поддеревья не наезжают друг на друга;
 * - события ЧЕРЕДУЮТСЯ над и под осью (первое — сверху);
 * - вложенные узлы события растут прочь от оси на СВОЕЙ стороне (depthSign =
 *   сторона события), поэтому потомок никогда не перескакивает через ось.
 *
 * Связи: корень→событие идёт по оси и втыкается в событие ВЕРТИКАЛЬНЫМ
 * сегментом; внутри события — ортогональная ветвь на его стороне. Ось нигде не
 * хранится: она каждый раз выводится из прямоугольника корня.
 */
export const timelineStrategy: LayoutStrategy = {
  kind: 'timeline',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'orthogonal',
  blockedReasonKey: 'constraint.timeline',
  routeTreeEdge: (ctx) => {
    const root = findRoot(ctx.nodes);
    if (!root) return null;
    const line = axisY(ctx, ctx.sourceRect);

    if (ctx.sourceId === root.id) {
      // Событие: вдоль оси до X события, затем вертикальный сегмент к нему.
      const sp = sidePort(ctx.sourceRect, 'right');
      const tp = sidePort(ctx.targetRect, isAbove(ctx.targetRect, line) ? 'bottom' : 'top');
      return axisBranchRoute(sp, tp, line);
    }

    // Вложенная ветвь: растёт прочь от оси, остаётся на стороне своего события.
    const down = rectCenter(ctx.targetRect).y >= rectCenter(ctx.sourceRect).y;
    const sp = sidePort(ctx.sourceRect, down ? 'bottom' : 'top');
    const tp = sidePort(ctx.targetRect, down ? 'top' : 'bottom');
    return verticalBusRoute(sp, tp, (sp.y + tp.y) / 2, CORNER_RADIUS);
  },
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;

    const children = treeChildrenMap(nodes, edges);
    const sizeById = new Map(nodes.map((n) => [n.id, nodeSize(n)]));
    const widthOf = (id: string): number => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).width;
    const heightOf = (id: string): number => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).height;

    // Корень сдвинут на половину размера, чтобы его ЦЕНТР (а значит и ось,
    // которую по нему находит routing) лёг ровно в начало координат.
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(root.id, { x: -widthOf(root.id) / 2, y: -heightOf(root.id) / 2 });

    const events = children.get(root.id) ?? [];
    if (events.length === 0) return withPositions(nodes, positions);

    // Слот события по X = ширина его поддерева (детали не лезут к соседям).
    const spans = new Map<string, number>();
    for (const event of events) {
      for (const [id, span] of buildSpans(event, children, widthOf, DETAIL_SIBLING_GAP)) {
        spans.set(id, span);
      }
    }

    let cursor = widthOf(root.id) / 2 + AXIS_START;
    events.forEach((event, i) => {
      const span = spans.get(event) ?? widthOf(event);
      const side: 1 | -1 = i % 2 === 0 ? -1 : 1; // первое событие — над осью
      placeSubtree(
        event,
        // Центр события — ровно на выносе AXIS_GAP от оси, симметрично с обеих сторон.
        side * TIMELINE_AXIS_GAP - heightOf(event) / 2,
        cursor + span / 2,
        children,
        spans,
        heightOf,
        widthOf,
        {
          depthAxis: 'y',
          depthSign: side,
          levelGap: DETAIL_LEVEL_GAP,
          siblingGap: DETAIL_SIBLING_GAP,
        },
        positions,
      );
      cursor += span + EVENT_GAP;
    });

    return withPositions(nodes, positions);
  },
};
