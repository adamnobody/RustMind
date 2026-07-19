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

/**
 * Дети по СТРУКТУРНЫМ рёбрам (free-связи иерархию не формируют), отсортированы
 * по data.order каждого ребёнка (стабильно; отсутствие order — в конец, в
 * исходном порядке). Единственный choke point сиблингового порядка — все
 * раскладки, читающие детей отсюда, получают порядок drag-переставления даром.
 */
export function treeChildrenMap(nodes: AppNode[], edges: AppEdge[]): Map<string, string[]> {
  const orderOf = new Map(nodes.map((n) => [n.id, n.data.order]));
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
  for (const list of map.values()) {
    list.sort((a, b) => (orderOf.get(a) ?? Number.MAX_SAFE_INTEGER) - (orderOf.get(b) ?? Number.MAX_SAFE_INTEGER));
  }
  return map;
}

/**
 * Узлы, скрытые сворачиванием. Два независимых механизма:
 * - `data.collapsedChildren` — свёрнутые ВЕТКИ: прячем перечисленных прямых
 *   потомков вместе с их поддеревьями (сам потомок тоже скрыт). Каждая ветка
 *   сворачивается отдельно — свернуть одну не трогает соседние.
 * - `data.collapsed` — legacy-режим (старые файлы): прячет ВСЕ поддеревья узла,
 *   сам узел виден.
 * Используется раскладкой (не выделять место) и канвасом (node.hidden).
 */
export function collapsedHiddenIds(nodes: AppNode[], edges: AppEdge[]): Set<string> {
  const children = treeChildrenMap(nodes, edges);
  const hidden = new Set<string>();
  // Прячет переданные узлы и все их поддеревья.
  const hideFrom = (startIds: string[]): void => {
    const stack = [...startIds];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (hidden.has(cur)) continue;
      hidden.add(cur);
      stack.push(...(children.get(cur) ?? []));
    }
  };
  for (const n of nodes) {
    const direct = children.get(n.id) ?? [];
    // legacy: свёрнут весь узел → прячем всех потомков (сам узел остаётся).
    if (n.data.collapsed) hideFrom(direct);
    // по ветке: прячем каждый свёрнутый прямой потомок + его поддерево.
    const folded = n.data.collapsedChildren;
    if (folded && folded.length > 0) {
      const directSet = new Set(direct);
      hideFrom(folded.filter((c) => directSet.has(c)));
    }
  }
  return hidden;
}

/**
 * Узлы, ИСКЛЮЧАЕМЫЕ ИЗ РАСКЛАДКИ при сворачивании — отличается от
 * {@link collapsedHiddenIds} (что прятать при рендере) специально: свёрнутый
 * прямой потомок ОСТАЁТСЯ в раскладке (держит свой слот), из раскладки убираем
 * лишь его ПОДДЕРЕВО. Так соседние ветки не перетекают на освободившееся место
 * и, главное, не наезжают на «застывшую» позицию свёрнутой ветки — иначе на
 * одну сторону попадали бы две ветки и одна кнопка сворачивала бы обе.
 * (legacy `collapsed` по-прежнему освобождает всё поддерево целиком.)
 */
export function layoutExcludedIds(nodes: AppNode[], edges: AppEdge[]): Set<string> {
  const children = treeChildrenMap(nodes, edges);
  const excluded = new Set<string>();
  // Исключает ПОТОМКОВ переданных узлов (сами узлы остаются в раскладке).
  const excludeDescendants = (rootIds: string[]): void => {
    const stack = rootIds.flatMap((rid) => children.get(rid) ?? []);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (excluded.has(cur)) continue;
      excluded.add(cur);
      stack.push(...(children.get(cur) ?? []));
    }
  };
  for (const n of nodes) {
    const direct = children.get(n.id) ?? [];
    // legacy: убираем всё поддерево узла (сам узел держит слот).
    if (n.data.collapsed) excludeDescendants(direct);
    // по ветке: убираем поддерево свёрнутого потомка, но сам потомок — в раскладке.
    const folded = n.data.collapsedChildren;
    if (folded && folded.length > 0) {
      const directSet = new Set(direct);
      excludeDescendants(folded.filter((c) => directSet.has(c)));
    }
  }
  return excluded;
}

/** Родитель по структурному ребру; null, если узел — корень/сирота. */
export function treeParentOf(nodeId: string, edges: AppEdge[]): string | null {
  const edge = edges.find((e) => e.target === nodeId && isTreeEdge(e));
  return edge ? edge.source : null;
}

/** Глубина каждого узла от корня по структурным рёбрам (корень = 0). BFS, O(N). */
export function treeDepthMap(nodes: AppNode[], edges: AppEdge[]): Map<string, number> {
  const children = treeChildrenMap(nodes, edges);
  const root = findRoot(nodes);
  const depth = new Map<string, number>();
  if (!root) return depth;
  const queue: [string, number][] = [[root.id, 0]];
  while (queue.length > 0) {
    const [id, d] = queue.shift()!;
    if (depth.has(id)) continue;
    depth.set(id, d);
    for (const child of children.get(id) ?? []) queue.push([child, d + 1]);
  }
  return depth;
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
  const children = treeChildrenMap(nodes, edges);
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
