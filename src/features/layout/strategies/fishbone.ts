import type { LayoutStrategy } from './types';
import { canConnectAsTree, findRoot, treeChildrenMap, withPositions } from './shared';

/** Геометрия «рыбьей кости»: хребет горизонтален, кости под ~45°. */
const SPINE_STEP = 220; // шаг точек крепления костей вдоль хребта
const BONE_STEP = 110; // шаг под-причин вдоль кости
const BONE_OFFSET = 90; // отступ первой под-причины от хребта
const SUB_SHIFT = 150; // горизонтальный вынос подписи под-причины от кости

/**
 * Диаграмма Исикавы: голова (корень-проблема) справа, горизонтальный хребет
 * влево. Категории (дети корня) — кости под ~45° попеременно сверху/снизу;
 * под-причины — мельче, вдоль своей кости. Связи — только причина→категория→
 * хребет (древесный предикат), произвольные ассоциации запрещены.
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

    categories.forEach((categoryId, i) => {
      const up = i % 2 === 0; // кости чередуются: над и под хребтом
      const attachX = -SPINE_STEP * (Math.floor(i / 2) + 1);
      const dirY = up ? -1 : 1;
      // Вершина кости (категория) — на 45° от точки крепления.
      const boneLen = BONE_OFFSET + BONE_STEP * ((children.get(categoryId) ?? []).length + 1);
      positions.set(categoryId, {
        x: attachX - boneLen * Math.SQRT1_2,
        y: dirY * boneLen * Math.SQRT1_2,
      });

      // Под-причины — вдоль кости от хребта к вершине, с выносом вбок.
      placeSubCauses(categoryId, attachX, dirY, 1, children, positions);
    });

    return withPositions(nodes, positions);
  },
};

function placeSubCauses(
  parentId: string,
  attachX: number,
  dirY: 1 | -1,
  depth: number,
  children: Map<string, string[]>,
  positions: Map<string, { x: number; y: number }>,
): void {
  const subs = children.get(parentId) ?? [];
  subs.forEach((subId, j) => {
    if (positions.has(subId)) return; // защита от порчи данных
    const along = BONE_OFFSET + BONE_STEP * (j + 1);
    positions.set(subId, {
      // Точка на кости (45°) + горизонтальный вынос, растущий с глубиной.
      x: attachX - along * Math.SQRT1_2 - SUB_SHIFT * depth,
      y: dirY * along * Math.SQRT1_2,
    });
    placeSubCauses(subId, attachX, dirY, depth + 1, children, positions);
  });
}
