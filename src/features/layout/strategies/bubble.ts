import type { LayoutStrategy } from './types';
import { bfsOrder, findRoot, nodeSize, withPositions } from './shared';

/**
 * Пузырьковая карта: центральная тема, атрибуты-пузыри по радиусу вокруг.
 * Связи — только центр↔пузырь: одно из концов ребра обязан быть корнем.
 */
export const bubbleStrategy: LayoutStrategy = {
  kind: 'bubble',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  positionMode: 'derived',
  edgeRouting: 'radial',
  blockedReasonKey: 'constraint.bubble',
  canConnect: (sourceId, targetId, ctx) => {
    if (sourceId === targetId) return false;
    const root = findRoot(ctx.nodes);
    if (!root) return false;
    // Ровно один конец — центр (центр↔центр невозможен: source≠target).
    return sourceId === root.id || targetId === root.id;
  },
  layout: (nodes, edges) => {
    const root = findRoot(nodes);
    if (!root) return nodes;
    const positions = new Map<string, { x: number; y: number }>();
    positions.set(root.id, { x: 0, y: 0 });

    const satellites = bfsOrder(nodes, edges).filter((n) => n.id !== root.id);
    if (satellites.length === 0) return withPositions(nodes, positions);

    // Радиус растёт с числом пузырей, чтобы они не наезжали друг на друга.
    const maxW = Math.max(...satellites.map((n) => nodeSize(n).width));
    const circumference = satellites.length * (maxW + 40);
    const radius = Math.max(240, circumference / (2 * Math.PI));

    satellites.forEach((node, i) => {
      const angle = (i / satellites.length) * 2 * Math.PI - Math.PI / 2;
      positions.set(node.id, {
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
      });
    });
    return withPositions(nodes, positions);
  },
};
