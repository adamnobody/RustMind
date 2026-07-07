import type { AppNode, AppEdge } from '../../../store/types';
import { isTreeEdge } from '../../edges/types';
import { nodeSize, treeParentOf } from '../../layout/strategies/shared';

/** Дискриминированное объединение — сужается по `kind` без явных приведений. */
export type DropTarget =
  | { kind: 'reparent'; parentId: string }
  | { kind: 'reorder'; parentId: string; index: number }
  | { kind: 'none' };

/** Радиус вокруг узла, в котором «промах» ещё считается reorder, а не none. */
const REORDER_RADIUS = 160;

function rectOf(node: AppNode): { x: number; y: number; width: number; height: number } {
  const { width, height } = nodeSize(node);
  return { x: node.position.x, y: node.position.y, width, height };
}

function centerOf(node: AppNode): { x: number; y: number } {
  const r = rectOf(node);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

function subtreeIds(rootId: string, edges: AppEdge[]): Set<string> {
  const result = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const e of edges) {
      if (e.source === current && isTreeEdge(e) && !result.has(e.target)) {
        result.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return result;
}

/**
 * XMind-модель drop-цели (детерминированная, Phase 1 — БЛОК 5): курсор внутри
 * прямоугольника узла → reparent к нему; курсор рядом с узлом (в радиусе, но
 * не над ним) → reorder среди его сиблингов, до/после в зависимости от того,
 * по какую сторону центра оказался курсор; иначе (далеко от всего) → none
 * (перетаскиваемый узел щёлкает обратно на вычисленное место).
 * Сам перетаскиваемый узел и его поддерево исключаются из кандидатов —
 * нельзя ни прикрепить узел к себе, ни к собственному потомку.
 */
export function resolveDropTarget(
  draggedId: string,
  pointer: { x: number; y: number },
  nodes: AppNode[],
  edges: AppEdge[],
): DropTarget {
  const excluded = subtreeIds(draggedId, edges);
  const candidates = nodes.filter((n) => !excluded.has(n.id));
  if (candidates.length === 0) return { kind: 'none' };

  for (const n of candidates) {
    const r = rectOf(n);
    if (
      pointer.x >= r.x &&
      pointer.x <= r.x + r.width &&
      pointer.y >= r.y &&
      pointer.y <= r.y + r.height
    ) {
      return { kind: 'reparent', parentId: n.id };
    }
  }

  let nearest: AppNode | null = null;
  let nearestDist = Infinity;
  for (const n of candidates) {
    const c = centerOf(n);
    const d = Math.hypot(pointer.x - c.x, pointer.y - c.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = n;
    }
  }
  if (!nearest || nearestDist > REORDER_RADIUS) return { kind: 'none' };

  const parentId = treeParentOf(nearest.id, edges);
  if (!parentId) return { kind: 'none' }; // ближайший — корень, сиблингов нет

  const siblings = nodes
    .filter((n) => treeParentOf(n.id, edges) === parentId && !excluded.has(n.id))
    .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
  const nearestIdx = siblings.findIndex((s) => s.id === nearest!.id);
  const nearestCenter = centerOf(nearest);
  const dx = pointer.x - nearestCenter.x;
  const dy = pointer.y - nearestCenter.y;
  // Доминирующая ось расхождения курсора от центра ближайшего сиблинга решает
  // «до» или «после» него встанет перетаскиваемый узел.
  const before = Math.abs(dx) >= Math.abs(dy) ? dx < 0 : dy < 0;
  const index = before ? nearestIdx : nearestIdx + 1;
  return { kind: 'reorder', parentId, index };
}
