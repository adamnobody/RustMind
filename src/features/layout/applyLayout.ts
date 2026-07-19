import type { AppNode, AppEdge, LayoutType } from '../../store/types';
import { getLayoutStrategy } from './strategies/registry';
import { layoutExcludedIds } from './strategies/shared';

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
): { nodes: AppNode[]; edges: AppEdge[] } {
  const strategy = getLayoutStrategy(layoutType);
  const excluded = layoutExcludedIds(nodes, edges);
  if (excluded.size === 0) {
    return { nodes: strategy.layout(nodes, edges), edges };
  }
  const laidOutNodes = nodes.filter((n) => !excluded.has(n.id));
  const laidOutEdges = edges.filter((e) => !excluded.has(e.source) && !excluded.has(e.target));
  const laidOut = strategy.layout(laidOutNodes, laidOutEdges);
  const posById = new Map(laidOut.map((n) => [n.id, n]));
  return { nodes: nodes.map((n) => posById.get(n.id) ?? n), edges };
}
