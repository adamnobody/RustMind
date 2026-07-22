import type { LayoutStrategy } from './types';
import { DEFAULT_NODE_SIZE } from '../../../shared/lib/constants';
import {
  polylineRoute,
  sidePort,
  straightFromPorts,
  type Rect,
} from '../../edges/lib/routing';
import { canConnectAsTree, findRoot, nodeSize, treeChildrenMap, withPositions } from './shared';
import { axisY, isAbove } from './routes';
import { buildSpans, placeSubtree } from './treeGeometry';

/** Геометрия «рыбьей кости»: голова-корень справа, хребет уходит влево. */
const SPINE_START = 280; // отступ первой категории от головы (> RIB_RUN + полголовы)
const SPINE_GAP = 60; // зазор вдоль хребта между соседними категориями
const RIB_MARGIN = 80; // мин. зазор между поддеревом категории и хребтом (по Y)
const GEN_GAP = 150; // расстояние между поколениями под-причин по X
const SIBLING_GAP = 28; // зазор между соседними под-причинами по Y
/** Горизонтальный вынос кости от точки крепления на хребте до категории. */
export const RIB_RUN = 120;

/**
 * X точки крепления кости категории на хребте. Чистая функция от текущего
 * прямоугольника категории — никакие anchors не хранятся в документе. Категории
 * раскладываются вдоль хребта строго по data.order с монотонно убывающим X,
 * поэтому и точки крепления получаются РАЗНЫМИ и упорядоченными.
 */
export function ribAnchorX(categoryRect: Rect): number {
  return categoryRect.x + categoryRect.width / 2 + RIB_RUN;
}

/**
 * Диаграмма Исикавы: голова (корень-проблема) справа, горизонтальный хребет
 * уходит влево. Дети корня — категории причин, чередуются над и под хребтом и
 * разносятся вдоль него ОБЩИМ фронтиром (по data.order), так что точки
 * крепления костей монотонно движутся влево и никогда не совпадают. Поддерево
 * категории — дерево, растущее влево (поколения по X-, сиблинги по Y), поэтому
 * под-причины любой глубины не наслаиваются.
 *
 * Связи: ребро корень→категория рисуется как отрезок хребта от головы до точки
 * крепления плюс диагональная кость до категории — отдельные пути накладываются
 * и складываются в один сплошной хребет. Под-причины соединяются прямыми
 * отрезками левая грань→правая грань вдоль своей кости.
 */
export const fishboneStrategy: LayoutStrategy = {
  kind: 'fishbone',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'straight',
  blockedReasonKey: 'constraint.fishbone',
  routeTreeEdge: (ctx) => {
    const root = findRoot(ctx.nodes);
    if (!root) return null;

    if (ctx.sourceId === root.id) {
      const spineY = axisY(ctx, ctx.sourceRect);
      const sp = sidePort(ctx.sourceRect, 'left');
      const tp = sidePort(ctx.targetRect, isAbove(ctx.targetRect, spineY) ? 'bottom' : 'top');
      // Крепление всегда левее головы — иначе «хребет» пошёл бы назад.
      const anchorX = Math.min(ribAnchorX(ctx.targetRect), sp.x - 1);
      return polylineRoute([sp, { x: anchorX, y: spineY }, tp], sp, tp, 0);
    }

    // Под-причина: прямая вдоль кости (поддерево растёт влево).
    return straightFromPorts(sidePort(ctx.sourceRect, 'left'), sidePort(ctx.targetRect, 'right'));
  },
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;

    const children = treeChildrenMap(nodes, edges);
    const categories = children.get(root.id) ?? [];
    const sizeById = new Map(nodes.map((n) => [n.id, nodeSize(n)]));
    const widthOf = (id: string): number => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).width;
    const heightOf = (id: string): number => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).height;

    // Голова — справа; её ЦЕНТР в начале координат, поэтому хребет (который
    // routing находит как горизонталь через центр корня) проходит по y = 0.
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(root.id, { x: -widthOf(root.id) / 2, y: -heightOf(root.id) / 2 });

    // ОБЩАЯ (не по-сторонняя) левая граница занятой части хребта: следующая
    // категория крепится строго левее предыдущей — порядок костей однозначен.
    let frontier = -SPINE_START;

    categories.forEach((categoryId, i) => {
      const up = i % 2 === 0; // кости чередуются: над и под хребтом
      const dirY: 1 | -1 = up ? -1 : 1;

      // Локальная раскладка поддерева категории: дерево влево (X-), сиблинги по Y.
      const local = new Map<string, { x: number; y: number }>();
      const spans = buildSpans(categoryId, children, heightOf, SIBLING_GAP);
      placeSubtree(
        categoryId,
        0,
        0,
        children,
        spans,
        widthOf,
        heightOf,
        { depthAxis: 'x', depthSign: -1, levelGap: GEN_GAP, siblingGap: SIBLING_GAP },
        local,
      );

      let localRight = -Infinity;
      let localLeft = Infinity;
      for (const [id, p] of local) {
        const half = widthOf(id) / 2;
        localRight = Math.max(localRight, p.x + half);
        localLeft = Math.min(localLeft, p.x - half);
      }

      // Вершину кости выносим от хребта так, чтобы поддерево его не задевало.
      const subtreeHalfHeight = (spans.get(categoryId) ?? heightOf(categoryId)) / 2;
      const tipX = frontier - localRight; // правый край поддерева = frontier
      // Центр категории — на выносе от хребта, симметрично для верха и низа.
      const tipY = dirY * (subtreeHalfHeight + RIB_MARGIN) - heightOf(categoryId) / 2;

      for (const [id, p] of local) {
        positions.set(id, { x: tipX + p.x, y: tipY + p.y });
      }

      frontier = tipX + localLeft - SPINE_GAP; // сдвигаем границу влево
    });

    return withPositions(nodes, positions);
  },
};
