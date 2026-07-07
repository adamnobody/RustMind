import type { AppNode, AppEdge } from '../../../store/types';
import type { LayoutKind } from '../engines/layoutTypes';
import type { LayoutStrategy } from './types';
import { hierarchyStrategy } from './hierarchy';
import { fishboneStrategy } from './fishbone';
import { networkStrategy } from './network';
import { bubbleStrategy } from './bubble';
import { radialTreeStrategy } from './radialTree';

/**
 * Реестр стратегий по ключу LayoutKind. Каждая стратегия изолирована в своём
 * модуле и реализует общий интерфейс (layout, nodeConstraint, edgeConstraint,
 * canConnect) — см. strategies/types.ts.
 */
export const LAYOUT_STRATEGIES: Record<LayoutKind, LayoutStrategy> = {
  hierarchy: hierarchyStrategy,
  fishbone: fishboneStrategy,
  network: networkStrategy,
  bubble: bubbleStrategy,
  tree: radialTreeStrategy,
};

export function getLayoutStrategy(kind: LayoutKind): LayoutStrategy {
  return LAYOUT_STRATEGIES[kind] ?? hierarchyStrategy;
}

/**
 * Валидно ли СУЩЕСТВУЮЩЕЕ ребро для раскладки. Проверяем предикатом «можно ли
 * создать его сейчас», исключив само ребро из контекста — иначе, например,
 * древесный предикат забраковал бы каждое ребро («у цели уже есть родитель» —
 * само это ребро). Невалидные рёбра не удаляются — только помечаются визуально;
 * запрещено лишь создавать новые нарушения (мягкий вариант БЛОКА 0).
 */
export function isEdgeValidForLayout(
  strategy: LayoutStrategy,
  edge: AppEdge,
  nodes: AppNode[],
  edges: AppEdge[],
): boolean {
  if (strategy.edgeConstraint === 'any') return true;
  const others = edges.filter((e) => e.id !== edge.id);
  return strategy.canConnect(edge.source, edge.target, { nodes, edges: others });
}
