import type { LayoutStrategy, TreeRouteContext } from '../../layout/strategies/types';
import {
  routeBetweenPorts,
  routeEdge,
  routeFixed,
  routeUserGeometry,
  type EdgeRoutingChoice,
  type Port,
  type RoutedEdge,
} from './routing';

export interface EdgeRouteRequest {
  /** Выбор пользователя из EdgeStyle.routing; 'auto' — решает раскладка. */
  geometry: EdgeRoutingChoice;
  /** Структурное ребро? free-связи НИКОГДА не получают семантику раскладки. */
  isTree: boolean;
  strategy: LayoutStrategy;
  ctx: TreeRouteContext;
  /** Порты реальных хэндлов — источник границ для 'fixed'-раскладок (free). */
  handles: { source: Port; target: Port };
}

/**
 * Единственное место, где решается ФОРМА ребра. Приоритет:
 *
 * 1. Явный пользовательский routing (не 'auto') — сильнее всего: переживает
 *    смену раскладки. В 'fixed'-раскладке границами остаются ручные хэндлы, но
 *    выбранная геометрия применяется МЕЖДУ ними.
 * 2. 'auto' (или отсутствие поля — старые документы):
 *    - 'fixed'-раскладка (free) → порт с хэндла как есть;
 *    - структурное ребро → специализированный маршрут стратегии, если она его
 *      объявила (шина оргструктуры, ось таймлайна, хребет fishbone);
 *    - иначе (в т.ч. ВСЕ free-связи) → общий routing по edgeRouting.
 *
 * Ничего из вычисленного здесь не хранится: путь строится заново из текущих
 * прямоугольников на каждый рендер.
 */
export function resolveEdgeRoute(req: EdgeRouteRequest): RoutedEdge {
  const { geometry, isTree, strategy, ctx, handles } = req;
  const fixedHandles = strategy.edgeRouting === 'fixed';

  if (geometry !== 'auto') {
    return fixedHandles
      ? routeBetweenPorts(handles.source, handles.target, geometry)
      : routeUserGeometry(ctx.sourceRect, ctx.targetRect, geometry);
  }

  if (fixedHandles) return routeFixed(handles.source, handles.target);

  if (isTree && strategy.routeTreeEdge) {
    const routed = strategy.routeTreeEdge(ctx);
    if (routed) return routed;
  }

  return routeEdge(ctx.sourceRect, ctx.targetRect, strategy.edgeRouting);
}
