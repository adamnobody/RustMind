import type { AppNode, AppEdge, LayoutType } from '../../store/types';
import { getLayoutStrategy } from './strategies/registry';
import { collapsedHiddenIds } from './strategies/shared';

/**
 * Applies auto-layout for the given layout kind via the strategy registry.
 * Moves node positions ONLY — edge handles are never touched (the handle a
 * user dragged from stays on the edge for good), and edges are returned as-is.
 * Each strategy decides which edges drive its geometry (all current kinds use
 * tree edges only, except 'network' which uses every edge).
 *
 * Свёрнутые поддеревья исключаются из раскладки, чтобы под ними не оставалось
 * пустого места; их узлы сохраняют прежние позиции (всё равно скрыты рендером).
 */
export function applyLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  layoutType: LayoutType,
): { nodes: AppNode[]; edges: AppEdge[] } {
  const strategy = getLayoutStrategy(layoutType);
  const hidden = collapsedHiddenIds(nodes, edges);
  if (hidden.size === 0) {
    return { nodes: strategy.layout(nodes, edges), edges };
  }
  const visibleNodes = nodes.filter((n) => !hidden.has(n.id));
  const visibleEdges = edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target));
  const laidOut = strategy.layout(visibleNodes, visibleEdges);
  const posById = new Map(laidOut.map((n) => [n.id, n]));
  return { nodes: nodes.map((n) => posById.get(n.id) ?? n), edges };
}
