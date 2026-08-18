import type { LayoutStrategy } from './types';
import { canConnectAsTree, findRoot, nodeSize, treeChildrenMap, withPositions } from './shared';
import { DEFAULT_NODE_SIZE } from '../../../shared/lib/constants';

const RING_STEP = 280; // минимальный зазор между кольцами уровней
const ARC_GAP = 48; // минимальный просвет между соседями внутри кольца

/**
 * Радиальное дерево: корень в центре, ветви расходятся по кольцам уровней.
 * Угловой сектор каждой ветви пропорционален числу её листьев. Ограничения —
 * как у hierarchy (только parent→child, без циклов), геометрия радиальная.
 *
 * Радиус кольца НЕ фиксирован: он подбирается так, чтобы каждый узел уровня
 * помещался в свой угловой сектор (длина дуги r·span должна покрывать
 * тангенциальный габарит узла + просвет) — иначе узкие секторы (много
 * сиблингов / глубокие уровни) накладывали бы узлы друг на друга.
 * Позиции центрируются (position = центр − размер/2), т.к. ReactFlow читает
 * position как левый верхний угол, а узлы здесь разной ширины.
 */
export const radialTreeStrategy: LayoutStrategy = {
  kind: 'tree',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'radial',
  blockedReasonKey: 'constraint.tree',
  canConnect: canConnectAsTree,
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;
    const children = treeChildrenMap(nodes, edges);
    const sizeById = new Map(nodes.map((n) => [n.id, nodeSize(n)]));
    const sizeOf = (id: string) => sizeById.get(id) ?? DEFAULT_NODE_SIZE;
    // Габариты узла поперёк и вдоль луча под углом a (узел — не точка).
    const tangential = (id: string, a: number) =>
      Math.abs(sizeOf(id).width * Math.sin(a)) + Math.abs(sizeOf(id).height * Math.cos(a));
    const radialExtent = (id: string, a: number) =>
      Math.abs(sizeOf(id).width * Math.cos(a)) + Math.abs(sizeOf(id).height * Math.sin(a));

    // Число листьев поддерева — вес углового сектора ветви (мемо, циклобезопасно).
    const leaves = new Map<string, number>();
    const leafCount = (id: string, stack: Set<string>): number => {
      const memo = leaves.get(id);
      if (memo !== undefined) return memo;
      if (stack.has(id)) return 1;
      stack.add(id);
      const kids = children.get(id) ?? [];
      const count =
        kids.length === 0 ? 1 : Math.max(kids.reduce((s, k) => s + leafCount(k, stack), 0), 1);
      stack.delete(id);
      leaves.set(id, count);
      return count;
    };

    // Проход 1: углы (не зависят от радиуса) — сектор делится по весам детей.
    const slots: { id: string; level: number; angle: number; span: number }[] = [];
    const walk = (id: string, level: number, a0: number, a1: number, seen: Set<string>): void => {
      if (seen.has(id)) return;
      seen.add(id);
      if (level > 0) slots.push({ id, level, angle: (a0 + a1) / 2, span: a1 - a0 });
      const kids = children.get(id) ?? [];
      if (kids.length === 0) return;
      const weights = kids.map((kid) => leafCount(kid, new Set()));
      const total = weights.reduce((s, w) => s + w, 0) || 1;
      let angle = a0;
      kids.forEach((kid, i) => {
        const span = ((a1 - a0) * weights[i]) / total;
        walk(kid, level + 1, angle, angle + span, seen);
        angle += span;
      });
    };
    walk(root.id, 0, -Math.PI / 2, (3 * Math.PI) / 2, new Set());

    // Проход 2: радиус каждого кольца — max(зазор от предыдущего, влезание в сектор).
    const maxLevel = slots.reduce((m, s) => Math.max(m, s.level), 0);
    const radii = new Map<number, number>([[0, 0]]);
    let prevRadius = 0;
    let prevExtent = radialExtent(root.id, 0);
    for (let level = 1; level <= maxLevel; level += 1) {
      const ring = slots.filter((s) => s.level === level);
      const extent = Math.max(...ring.map((s) => radialExtent(s.id, s.angle)));
      const fit = Math.max(
        ...ring.map((s) => (tangential(s.id, s.angle) + ARC_GAP) / Math.max(s.span, 1e-6)),
      );
      const radius = Math.max(
        prevRadius + Math.max(RING_STEP, (prevExtent + extent) / 2 + ARC_GAP),
        fit,
      );
      radii.set(level, radius);
      prevRadius = radius;
      prevExtent = extent;
    }

    // position — левый верхний угол, поэтому центр сдвигается на половину размера.
    const positions = new Map<string, { x: number; y: number }>();
    const put = (id: string, cx: number, cy: number) => {
      const { width, height } = sizeOf(id);
      positions.set(id, { x: Math.round(cx - width / 2), y: Math.round(cy - height / 2) });
    };
    put(root.id, 0, 0);
    for (const slot of slots) {
      const radius = radii.get(slot.level) ?? slot.level * RING_STEP;
      put(slot.id, radius * Math.cos(slot.angle), radius * Math.sin(slot.angle));
    }
    return withPositions(nodes, positions);
  },
};
