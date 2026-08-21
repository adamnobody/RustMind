import type { AppNode, AppEdge, Group, LayoutType } from '../../domain/mind-map';
import { getLayoutStrategy } from './strategies/registry';
import { layoutExcludedIds } from './strategies/shared';
import { separateGroupIntruders } from '../groups/separate';

/**
 * Applies auto-layout for the given layout kind via the strategy registry.
 * Moves node positions ONLY — edge handles are never touched (the handle a
 * user dragged from stays on the edge for good), and edges are returned as-is.
 * Each strategy decides which edges drive its geometry (all current kinds use
 * tree edges only, except 'network' which uses every edge).
 *
 * Из раскладки исключаются ПОДДЕРЕВЬЯ свёрнутых веток (см. layoutExcludedIds),
 * но сам свёрнутый прямой потомок остаётся и держит свой слот — иначе соседние
 * ветки наехали бы на его застывшую позицию (две ветки на одну сторону → одна
 * кнопка сворачивала бы обе). Исключённые узлы сохраняют прежние позиции (они
 * скрыты рендером).
 */
export function applyLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  layoutType: LayoutType,
  groups: Group[] = [],
): { nodes: AppNode[]; edges: AppEdge[] } {
  const strategy = getLayoutStrategy(layoutType);
  const excluded = layoutExcludedIds(nodes, edges);
  const laidOutNodes = excluded.size === 0 ? nodes : nodes.filter((n) => !excluded.has(n.id));
  const laidOutEdges =
    excluded.size === 0 ? edges : edges.filter((e) => !excluded.has(e.source) && !excluded.has(e.target));
  const laidOut = strategy.layout(laidOutNodes, laidOutEdges);
  const posById = new Map(laidOut.map((n) => [n.id, n]));
  let next = excluded.size === 0 ? laidOut : nodes.map((n) => posById.get(n.id) ?? n);
  // derived: после геометрической раскладки выносим чужие ветки из AABB групп.
  // stored (free/network) — позиции пользователя, не трогаем.
  if (strategy.positionMode === 'derived' && groups.length > 0) {
    next = separateGroupIntruders(next, edges, groups);
  }
  return { nodes: next, edges };
}
