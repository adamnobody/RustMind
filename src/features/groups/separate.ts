import type { AppNode, AppEdge, Group } from '../../domain/mind-map';
import { DEFAULT_NODE_SIZE } from '../../shared/lib/constants';
import { collapsedHiddenIds, treeChildrenMap, treeParentOf } from '../layout/strategies/shared';
import { groupBounds, rectsOverlap, type Rect } from './bounds';
import { GROUP_CLEARANCE, GROUP_PADDING } from './types';

const MAX_PASSES = 8;

function nodeRect(node: AppNode): Rect {
  return {
    x: node.position.x,
    y: node.position.y,
    w: node.measured?.width ?? DEFAULT_NODE_SIZE.width,
    h: node.measured?.height ?? DEFAULT_NODE_SIZE.height,
  };
}

/** Предки членов группы: их нельзя сдвигать, иначе уедет сама группа. */
function frozenIds(memberIds: Iterable<string>, edges: AppEdge[]): Set<string> {
  const frozen = new Set<string>();
  for (const id of memberIds) {
    let current: string | null = id;
    const seen = new Set<string>();
    while (current !== null && !seen.has(current)) {
      seen.add(current);
      frozen.add(current);
      current = treeParentOf(current, edges);
    }
  }
  return frozen;
}

function descendantIds(rootId: string, children: Map<string, string[]>): string[] {
  const out: string[] = [];
  const stack = [rootId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    const kids = children.get(id);
    if (kids) stack.push(...kids);
  }
  return out;
}

/**
 * Кратчайший осевой сдвиг, чтобы `inner` полностью оказался снаружи `box`
 * с зазором `gap`. Уже снаружи → {0,0}.
 */
export function shortestEscape(inner: Rect, box: Rect, gap: number): { x: number; y: number } {
  const t: Rect = {
    x: box.x - gap,
    y: box.y - gap,
    w: box.w + gap * 2,
    h: box.h + gap * 2,
  };
  if (!rectsOverlap(inner, t)) return { x: 0, y: 0 };
  const left = t.x - (inner.x + inner.w);
  const right = t.x + t.w - inner.x;
  const up = t.y - (inner.y + inner.h);
  const down = t.y + t.h - inner.y;
  const candidates = [
    { x: left, y: 0, abs: Math.abs(left) },
    { x: right, y: 0, abs: Math.abs(right) },
    { x: 0, y: up, abs: Math.abs(up) },
    { x: 0, y: down, abs: Math.abs(down) },
  ];
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].abs < best.abs) best = candidates[i];
  }
  return { x: best.x, y: best.y };
}

/**
 * Пост-проход derived-раскладки: чужие ветки, визуально попавшие в AABB
 * группы, сдвигаются целиком по ближайшей оси. Членов группы и их предков
 * не трогает. Идемпотентна, если пересечений нет.
 */
export function separateGroupIntruders(
  nodes: AppNode[],
  edges: AppEdge[],
  groups: Group[],
): AppNode[] {
  if (groups.length === 0 || nodes.length === 0) return nodes;

  const hidden = collapsedHiddenIds(nodes, edges);
  const children = treeChildrenMap(nodes, edges);
  let current = nodes;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const byId = new Map(current.map((n) => [n.id, n]));
    const delta = new Map<string, { x: number; y: number }>();

    for (const g of groups) {
      if (g.nodeIds.length === 0) continue;
      const frozen = frozenIds(g.nodeIds, edges);
      const memberRects: Rect[] = [];
      for (const id of g.nodeIds) {
        if (hidden.has(id)) continue;
        const n = byId.get(id);
        if (n) memberRects.push(nodeRect(n));
      }
      const b = groupBounds(memberRects);
      if (!b) continue;
      const box: Rect = {
        x: b.x - GROUP_PADDING,
        y: b.y - GROUP_PADDING,
        w: b.width + GROUP_PADDING * 2,
        h: b.height + GROUP_PADDING * 2,
      };

      const overlapping: string[] = [];
      for (const n of current) {
        if (hidden.has(n.id) || frozen.has(n.id)) continue;
        if (rectsOverlap(nodeRect(n), box)) overlapping.push(n.id);
      }
      if (overlapping.length === 0) continue;

      const overlapSet = new Set(overlapping);
      const roots = overlapping.filter((id) => {
        const p = treeParentOf(id, edges);
        return p === null || frozen.has(p) || !overlapSet.has(p);
      });

      for (const root of roots) {
        const subtree = descendantIds(root, children).filter((id) => !frozen.has(id) && !hidden.has(id));
        const rects = subtree.map((id) => byId.get(id)).filter((n): n is AppNode => Boolean(n)).map(nodeRect);
        const sb = groupBounds(rects);
        if (!sb) continue;
        const inner: Rect = { x: sb.x, y: sb.y, w: sb.width, h: sb.height };
        const d = shortestEscape(inner, box, GROUP_CLEARANCE);
        if (d.x === 0 && d.y === 0) continue;
        for (const id of subtree) {
          const prev = delta.get(id) ?? { x: 0, y: 0 };
          delta.set(id, { x: prev.x + d.x, y: prev.y + d.y });
        }
      }
    }

    if (delta.size === 0) return current;
    current = current.map((n) => {
      const d = delta.get(n.id);
      if (!d) return n;
      return { ...n, position: { x: n.position.x + d.x, y: n.position.y + d.y } };
    });
  }

  return current;
}
