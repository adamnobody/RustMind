import type { LayoutStrategy } from './types';
import { DEFAULT_NODE_SIZE } from '../../../shared/lib/constants';
import { canConnectAsTree, findRoot, treeChildrenMap, nodeSize, withPositions } from './shared';
import { buildSpans, placeSubtree } from './treeGeometry';

const ITEM_GAP = 60; // зазор между соседними пунктами таймлайна (сверх их ширины)
const TIMELINE_Y = 220; // расстояние от корня до горизонтальной оси таймлайна
const DETAIL_LEVEL_GAP = 110; // шаг вниз для деталей пункта
const DETAIL_SIBLING_GAP = 24; // зазор между соседними деталями одного пункта

/**
 * Таймлайн: корень — заголовок, над центром оси. Дети первого уровня — пункты
 * таймлайна, расположены слева направо в порядке order на общей горизонтали;
 * зазор между ними учитывает ширину поддерева каждого пункта (детали не
 * наезжают на соседний пункт). Потомки каждого пункта раскладываются под ним
 * вниз (как org), не влияя на порядок остальных пунктов.
 */
export const timelineStrategy: LayoutStrategy = {
  kind: 'timeline',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'orthogonal',
  blockedReasonKey: 'constraint.timeline',
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(root.id, { x: 0, y: 0 });

    const children = treeChildrenMap(nodes, edges);
    const items = children.get(root.id) ?? [];
    if (items.length === 0) return withPositions(nodes, positions);

    const sizeById = new Map(nodes.map((n) => [n.id, nodeSize(n)]));
    const widthOf = (id: string): number => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).width;
    const heightOf = (id: string): number => (sizeById.get(id) ?? DEFAULT_NODE_SIZE).height;

    // Ширина каждого пункта с учётом его собственного поддерева деталей.
    const spans = new Map<string, number>();
    for (const item of items) {
      for (const [id, span] of buildSpans(item, children, widthOf, DETAIL_SIBLING_GAP)) {
        spans.set(id, span);
      }
    }

    const totalWidth = items.reduce(
      (sum, id, i) => sum + (spans.get(id) ?? widthOf(id)) + (i > 0 ? ITEM_GAP : 0),
      0,
    );
    let cursor = -totalWidth / 2;
    for (const item of items) {
      const span = spans.get(item) ?? widthOf(item);
      const centerX = cursor + span / 2;
      placeSubtree(
        item,
        TIMELINE_Y,
        centerX,
        children,
        spans,
        heightOf,
        widthOf,
        { depthAxis: 'y', depthSign: 1, levelGap: DETAIL_LEVEL_GAP, siblingGap: DETAIL_SIBLING_GAP },
        positions,
      );
      cursor += span + ITEM_GAP;
    }

    return withPositions(nodes, positions);
  },
};
