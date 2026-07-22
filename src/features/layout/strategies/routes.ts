import {
  CORNER_RADIUS,
  polylineRoute,
  rectCenter,
  sidePort,
  type Point,
  type Port,
  type Rect,
  type RoutedEdge,
} from '../../edges/lib/routing';
import { findRoot, treeChildrenMap } from './shared';
import type { TreeRouteContext } from './types';

/**
 * Общие кирпичики СЕМАНТИЧЕСКИХ маршрутов раскладок. Всё чистое: на вход —
 * прямоугольники и id, на выход — путь. Ни шины, ни оси, ни точки крепления
 * нигде не сохраняются — они каждый раз выводятся из текущей геометрии.
 */

/** Минимальный вынос маршрута, когда цель оказалась «позади» источника. */
const MIN_RUN = 24;
/** Длина «носика» локальной шины (logic): вертикаль у правой грани родителя. */
export const LOCAL_BUS_STUB = 26;

/** V-H-V через общую горизонталь busY (иерархия, оргструктура, таймлайн). */
export function verticalBusRoute(sp: Port, tp: Port, busY: number, radius: number): RoutedEdge {
  return polylineRoute([sp, { x: sp.x, y: busY }, { x: tp.x, y: busY }, tp], sp, tp, radius);
}

/** H-V-H через общую вертикаль busX (right/left/logic). */
export function horizontalBusRoute(sp: Port, tp: Port, busX: number, radius: number): RoutedEdge {
  return polylineRoute([sp, { x: busX, y: sp.y }, { x: busX, y: tp.y }, tp], sp, tp, radius);
}

/** Сверху вниз: низ родителя → верх ребёнка, без боковых заходов и подъёмов. */
export function topDownRoute(sourceRect: Rect, targetRect: Rect, radius = CORNER_RADIUS): RoutedEdge {
  const sp = sidePort(sourceRect, 'bottom');
  const tp = sidePort(targetRect, 'top');
  const busY = tp.y > sp.y ? (sp.y + tp.y) / 2 : sp.y + MIN_RUN;
  return verticalBusRoute(sp, tp, busY, radius);
}

/** Слева направо: правая грань родителя → левая грань ребёнка. */
export function leftToRightRoute(sourceRect: Rect, targetRect: Rect, radius = CORNER_RADIUS): RoutedEdge {
  const sp = sidePort(sourceRect, 'right');
  const tp = sidePort(targetRect, 'left');
  const busX = tp.x > sp.x ? (sp.x + tp.x) / 2 : sp.x + MIN_RUN;
  return horizontalBusRoute(sp, tp, busX, radius);
}

/** Справа налево: левая грань родителя → правая грань ребёнка. */
export function rightToLeftRoute(sourceRect: Rect, targetRect: Rect, radius = CORNER_RADIUS): RoutedEdge {
  const sp = sidePort(sourceRect, 'left');
  const tp = sidePort(targetRect, 'right');
  const busX = tp.x < sp.x ? (sp.x + tp.x) / 2 : sp.x - MIN_RUN;
  return horizontalBusRoute(sp, tp, busX, radius);
}

/**
 * Y ОБЩЕЙ горизонтальной шины группы сиблингов: середина между нижней гранью
 * родителя и самой верхней гранью среди его детей. Формула зависит только от
 * родителя и группы детей, поэтому все рёбра группы получают ОДИН И ТОТ ЖЕ
 * busY — отдельные пути визуально сливаются в одну шину оргструктуры.
 */
export function siblingBusY(ctx: TreeRouteContext): number {
  const parentBottom = ctx.sourceRect.y + ctx.sourceRect.height;
  const siblings = treeChildrenMap(ctx.nodes, ctx.edges).get(ctx.sourceId) ?? [ctx.targetId];
  let top = Infinity;
  for (const id of siblings) {
    const rect = id === ctx.targetId ? ctx.targetRect : ctx.rectOf(id);
    if (rect) top = Math.min(top, rect.y);
  }
  if (!Number.isFinite(top)) top = ctx.targetRect.y;
  return top > parentBottom ? (parentBottom + top) / 2 : parentBottom + MIN_RUN;
}

/** Горизонталь, вдоль которой идёт ось/хребет раскладки: центр корня по Y. */
export function axisY(ctx: TreeRouteContext, fallbackRect: Rect): number {
  const root = findRoot(ctx.nodes);
  const rect = (root ? ctx.rectOf(root.id) : undefined) ?? fallbackRect;
  return rect.y + rect.height / 2;
}

/** true, если прямоугольник лежит выше горизонтали (используется чередованием). */
export function isAbove(rect: Rect, lineY: number): boolean {
  return rectCenter(rect).y < lineY;
}

/** Ломаная «вдоль оси, затем перпендикулярно к элементу» (таймлайн, хребет). */
export function axisBranchRoute(sp: Port, tp: Port, lineY: number): RoutedEdge {
  const points: Point[] = [sp, { x: sp.x, y: lineY }, { x: tp.x, y: lineY }, tp];
  return polylineRoute(points, sp, tp, 0);
}
