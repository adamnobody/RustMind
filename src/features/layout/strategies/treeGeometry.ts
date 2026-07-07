import type { AppNode, AppEdge } from '../../../store/types';
import { DEFAULT_NODE_SIZE } from '../../../shared/lib/constants';
import { findRoot, treeChildrenMap, nodeSize } from './shared';

/** Ось, вдоль которой растёт глубина дерева; перпендикулярная ось — «сиблинговая». */
export type DepthAxis = 'x' | 'y';

export interface AxisTreeOptions {
  depthAxis: DepthAxis;
  depthSign: 1 | -1;
  levelGap: number;
  siblingGap: number;
}

type SizeOf = (id: string) => number;

/**
 * Пост-order: «спред» (размер вдоль сиблинговой оси) поддерева, укоренённого
 * в id — max(собственный размер, сумма спредов детей + зазоры). Лист = его
 * собственный размер. Защита от циклов — посещённые узлы не пересчитываются
 * (испорченные данные не уводят рекурсию в бесконечность).
 */
export function buildSpans(
  rootId: string,
  children: Map<string, string[]>,
  secondarySizeOf: SizeOf,
  siblingGap: number,
): Map<string, number> {
  const spans = new Map<string, number>();
  const visited = new Set<string>();
  const visit = (id: string): number => {
    if (visited.has(id)) return secondarySizeOf(id);
    visited.add(id);
    const kids = children.get(id) ?? [];
    if (kids.length === 0) {
      const s = secondarySizeOf(id);
      spans.set(id, s);
      return s;
    }
    let total = 0;
    kids.forEach((k, i) => {
      total += visit(k);
      if (i > 0) total += siblingGap;
    });
    const s = Math.max(secondarySizeOf(id), total);
    spans.set(id, s);
    return s;
  };
  visit(rootId);
  return spans;
}

/**
 * Пре-order размещение поддерева id: сам узел — в (primary, secondaryCenter);
 * дети раскладываются вдоль сиблинговой оси внутри своей полосы (по spans),
 * центрированной на secondaryCenter, и сдвигаются по глубине на levelGap
 * (со знаком depthSign) от границы родителя. spans должны покрывать всё
 * поддерево (см. buildSpans, вызванный с тем же rootId).
 */
export function placeSubtree(
  id: string,
  primary: number,
  secondaryCenter: number,
  children: Map<string, string[]>,
  spans: Map<string, number>,
  primarySizeOf: SizeOf,
  secondarySizeOf: SizeOf,
  options: AxisTreeOptions,
  positions: Map<string, { x: number; y: number }>,
  visited: Set<string> = new Set(),
): void {
  if (visited.has(id)) return;
  visited.add(id);
  positions.set(
    id,
    options.depthAxis === 'x' ? { x: primary, y: secondaryCenter } : { x: secondaryCenter, y: primary },
  );

  const kids = children.get(id) ?? [];
  if (kids.length === 0) return;

  const bandTotal = kids.reduce(
    (sum, k, i) => sum + (spans.get(k) ?? secondarySizeOf(k)) + (i > 0 ? options.siblingGap : 0),
    0,
  );
  let cursor = secondaryCenter - bandTotal / 2;
  const parentPrimarySize = primarySizeOf(id);
  for (const kid of kids) {
    const span = spans.get(kid) ?? secondarySizeOf(kid);
    const kidCenter = cursor + span / 2;
    const kidPrimary =
      primary + options.depthSign * (parentPrimarySize / 2 + options.levelGap + primarySizeOf(kid) / 2);
    placeSubtree(kid, kidPrimary, kidCenter, children, spans, primarySizeOf, secondarySizeOf, options, positions, visited);
    cursor += span + options.siblingGap;
  }
}

/**
 * Раскладка всего дерева вдоль одной оси, корень — в начале координат
 * (right/left/org/logic). Возвращает карту позиций; вызывающий переносит их
 * на узлы через withPositions.
 */
export function layoutAxisTree(
  nodes: AppNode[],
  edges: AppEdge[],
  options: AxisTreeOptions,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const root = findRoot(nodes);
  if (!root) return positions;

  const children = treeChildrenMap(nodes, edges);
  const sizeById = new Map(nodes.map((n) => [n.id, nodeSize(n)]));
  const primarySizeOf: SizeOf = (id) =>
    options.depthAxis === 'x'
      ? (sizeById.get(id) ?? DEFAULT_NODE_SIZE).width
      : (sizeById.get(id) ?? DEFAULT_NODE_SIZE).height;
  const secondarySizeOf: SizeOf = (id) =>
    options.depthAxis === 'x'
      ? (sizeById.get(id) ?? DEFAULT_NODE_SIZE).height
      : (sizeById.get(id) ?? DEFAULT_NODE_SIZE).width;

  const spans = buildSpans(root.id, children, secondarySizeOf, options.siblingGap);
  placeSubtree(root.id, 0, 0, children, spans, primarySizeOf, secondarySizeOf, options, positions);
  return positions;
}
