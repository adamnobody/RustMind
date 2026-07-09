import type { LayoutStrategy } from './types';
import { DEFAULT_NODE_SIZE } from '../../../shared/lib/constants';
import { canConnectAsTree, findRoot, nodeSize, treeChildrenMap, withPositions } from './shared';
import { buildSpans, placeSubtree } from './treeGeometry';

/** Геометрия «рыбьей кости»: голова-корень справа, хребет уходит влево. */
const SPINE_START = 200; // отступ первой точки крепления ребра от головы
const SPINE_GAP = 60; // зазор вдоль хребта между соседними рёбрами одной стороны
const RIB_MARGIN = 80; // мин. зазор между поддеревом ребра и хребтом (по Y)
const GEN_GAP = 150; // расстояние между поколениями под-причин по X
const SIBLING_GAP = 28; // зазор между соседними под-причинами по Y

/**
 * Диаграмма Исикавы: голова (корень-проблема) справа, хребет уходит влево.
 * Категории (дети корня) — рёбра, попеременно над и под хребтом. Поддерево
 * каждой категории раскладывается как дерево, растущее влево (поколения по X-,
 * сиблинги по Y), поэтому под-причины любой глубины не наслаиваются. Рёбра одной
 * стороны разносятся вдоль хребта по фактической ширине их поддеревьев, так что
 * добавление потомков не ломает раскладку. Связи — только причина→категория→
 * корень (древесный предикат), произвольные ассоциации запрещены.
 */
export const fishboneStrategy: LayoutStrategy = {
  kind: 'fishbone',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'straight',
  blockedReasonKey: 'constraint.fishbone',
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;

    const children = treeChildrenMap(nodes, edges);
    const categories = children.get(root.id) ?? [];
    const positions = new Map<string, { x: number; y: number }>();

    // Голова — справа, в (0,0); хребет уходит влево.
    positions.set(root.id, { x: 0, y: 0 });

    const sizeById = new Map(nodes.map((n) => [n.id, nodeSize(n)]));
    const widthOf = (id: string) => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).width;
    const heightOf = (id: string) => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).height;

    // Левая граница уже занятой части хребта для каждой стороны: следующее ребро
    // этой стороны крепится левее, чтобы поддеревья не пересекались по X.
    const frontier: Record<'up' | 'down', number> = { up: -SPINE_START, down: -SPINE_START };

    categories.forEach((categoryId, i) => {
      const up = i % 2 === 0; // рёбра чередуются: над и под хребтом
      const dirY: 1 | -1 = up ? -1 : 1;

      // Локальная раскладка поддерева категории: дерево, растущее влево (X-),
      // сиблинги разложены по Y. Категория попадает в локальное (0,0).
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

      // Границы поддерева в локальных координатах (для разноса вдоль хребта).
      let localRight = -Infinity;
      let localLeft = Infinity;
      for (const [id, p] of local) {
        const half = widthOf(id) / 2;
        localRight = Math.max(localRight, p.x + half);
        localLeft = Math.min(localLeft, p.x - half);
      }

      // Вершину ребра выносим от хребта так, чтобы поддерево не задевало хребет.
      const subtreeHalfHeight = (spans.get(categoryId) ?? heightOf(categoryId)) / 2;
      const side = up ? 'up' : 'down';
      const tipX = frontier[side] - localRight; // правый край поддерева = frontier
      const tipY = dirY * (subtreeHalfHeight + RIB_MARGIN);

      for (const [id, p] of local) {
        positions.set(id, { x: tipX + p.x, y: tipY + p.y });
      }

      frontier[side] = tipX + localLeft - SPINE_GAP; // сдвигаем границу влево
    });

    return withPositions(nodes, positions);
  },
};
