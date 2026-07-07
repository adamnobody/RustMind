import type { AppNode, AppEdge } from '../../../store/types';
import { isTreeEdge } from '../../edges/types';
import { DEFAULT_NODE_SIZE, ROOT_NODE_SIZE } from '../../../shared/lib/constants';
import type { ConnectContext } from './types';

/** Общие геометрические/графовые помощники стратегий. Всё чистое, без стора. */

export function findRoot(nodes: AppNode[]): AppNode | undefined {
  return nodes.find((n) => n.data.isRoot) ?? nodes[0];
}

export function nodeSize(node: AppNode): { width: number; height: number } {
  const fallback = node.data.isRoot ? ROOT_NODE_SIZE : DEFAULT_NODE_SIZE;
  return {
    width: (node.measured?.width ?? node.width) ?? fallback.width,
    height: (node.measured?.height ?? node.height) ?? fallback.height,
  };
}

/** Дети по СТРУКТУРНЫМ рёбрам (free-связи иерархию не формируют). */
export function treeChildrenMap(edges: AppEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    if (!isTreeEdge(e)) continue;
    const list = map.get(e.source);
    if (list) {
      list.push(e.target);
    } else {
      map.set(e.source, [e.target]);
    }
  }
  return map;
}

/** Родитель по структурному ребру; null, если узел — корень/сирота. */
export function treeParentOf(nodeId: string, edges: AppEdge[]): string | null {
  const edge = edges.find((e) => e.target === nodeId && isTreeEdge(e));
  return edge ? edge.source : null;
}

/** Глубина узла в дереве (корень/сирота = 0). С защитой от порчи данных (циклов). */
export function treeDepth(nodeId: string, edges: AppEdge[]): number {
  let depth = 0;
  let current: string | null = nodeId;
  const seen = new Set<string>();
  while (current !== null && !seen.has(current)) {
    seen.add(current);
    current = treeParentOf(current, edges);
    if (current !== null) depth += 1;
  }
  return depth;
}

/** true, если maybeAncestor — предок nodeId по структурным рёбрам (или тот же узел). */
export function isTreeAncestorOrSelf(
  maybeAncestor: string,
  nodeId: string,
  edges: AppEdge[],
): boolean {
  let current: string | null = nodeId;
  const seen = new Set<string>();
  while (current !== null && !seen.has(current)) {
    if (current === maybeAncestor) return true;
    seen.add(current);
    current = treeParentOf(current, edges);
  }
  return false;
}

/** true, если по НАПРАВЛЕННЫМ рёбрам (всем) существует путь from → to. */
export function hasDirectedPath(from: string, to: string, edges: AppEdge[]): boolean {
  const stack = [from];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === to) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const e of edges) {
      if (e.source === current) stack.push(e.target);
    }
  }
  return false;
}

/**
 * Детерминированный порядок узлов: корень, затем BFS по дереву, затем узлы,
 * недостижимые из корня (в исходном порядке массива). Используется раскладками,
 * которым нужен линейный порядок (block/dialogue/bridge).
 */
export function bfsOrder(nodes: AppNode[], edges: AppEdge[]): AppNode[] {
  if (nodes.length === 0) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = treeChildrenMap(edges);
  const root = findRoot(nodes);
  const result: AppNode[] = [];
  const seen = new Set<string>();
  const queue: string[] = root ? [root.id] : [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (node) result.push(node);
    for (const child of children.get(id) ?? []) queue.push(child);
  }
  for (const node of nodes) {
    if (!seen.has(node.id)) result.push(node);
  }
  return result;
}

/**
 * Базовый древесный предикат (hierarchy/tree/fishbone): ребро валидно только
 * как parent→child — у цели ещё нет родителя, цель не корень, и связь не
 * замыкает цикл (цель не предок источника). Неизвестный target = новый лист.
 */
export function canConnectAsTree(sourceId: string, targetId: string, ctx: ConnectContext): boolean {
  if (sourceId === targetId) return false;
  const target = ctx.nodes.find((n) => n.id === targetId);
  if (target?.data.isRoot) return false;
  if (treeParentOf(targetId, ctx.edges) !== null) return false;
  return !isTreeAncestorOrSelf(targetId, sourceId, ctx.edges);
}

/** Вернуть узлы с новыми позициями из карты; отсутствующие в карте — как есть. */
export function withPositions(
  nodes: AppNode[],
  positions: Map<string, { x: number; y: number }>,
): AppNode[] {
  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return node;
    return { ...node, position: { x: pos.x, y: pos.y } };
  });
}
