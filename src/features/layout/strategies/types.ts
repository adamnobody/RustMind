import type { AppNode, AppEdge } from '../../../store/types';
import type { LayoutKind } from '../engines/layoutTypes';
import type { TranslationKey } from '../../../shared/i18n/translations';
import type { EdgeRouting, Rect, RoutedEdge } from '../../edges/lib/routing';

/**
 * Всё, что нужно стратегии, чтобы проложить СТРУКТУРНОЕ ребро: концы, их
 * ИЗМЕРЕННЫЕ прямоугольники и доступ к остальной карте (для общих шин, оси
 * таймлайна, хребта fishbone). Вся эта геометрия вычисляемая — ничего из неё
 * не попадает в документ.
 */
export interface TreeRouteContext {
  sourceId: string;
  targetId: string;
  sourceRect: Rect;
  targetRect: Rect;
  /** Прямоугольник любого узла карты; undefined — узел ещё не измерен. */
  rectOf: (id: string) => Rect | undefined;
  nodes: AppNode[];
  edges: AppEdge[];
}

/**
 * Специализированный маршрут структурного ребра. null — стратегия отказалась
 * (нет данных / нетипичный случай), рендер падает на общий routeEdge по
 * edgeRouting. Применяется ТОЛЬКО при routing: 'auto' и только к tree-рёбрам.
 */
export type TreeRouteBuilder = (ctx: TreeRouteContext) => RoutedEdge | null;

/**
 * Декларации ограничений раскладки (БЛОК 0):
 * - nodeConstraint — всегда мягкий: drag разрешён (реинтерпретируется как
 *   reparent/reorder структуры), форма не удерживается силой и восстанавливается
 *   пересборкой после любого структурного изменения.
 * - edgeConstraint — жёсткий: 'typed' раскладка блокирует СОЗДАНИЕ рёбер,
 *   нарушающих семантику типа (предикат canConnect). Существующие невалидные
 *   рёбра не удаляются — только помечаются визуально.
 */
export type NodeConstraint = 'soft';
export type EdgeConstraint = 'any' | 'typed';
/**
 * 'derived' — позиции ВСЕГДА пересчитываются движком из структуры дерева,
 * пользователь их не задаёт. 'stored' — только у network: позиции мягкие,
 * хранятся как есть (force-sim), свободный drag.
 */
export type PositionMode = 'derived' | 'stored';

export interface ConnectContext {
  nodes: AppNode[];
  edges: AppEdge[];
}

export interface LayoutStrategy {
  kind: LayoutKind;
  nodeConstraint: NodeConstraint;
  edgeConstraint: EdgeConstraint;
  positionMode: PositionMode;
  /**
   * Предпочтительный роутинг рёбер этой раскладки (только рендер, не данные):
   * - 'orthogonal' — H/V сегменты, углы 90°, порты на обращённых сторонах;
   * - 'bezier' — кривая с выходом перпендикулярно стороне, кривизна ∝ расстоянию;
   * - 'radial' — порт вдоль радиального луча, почти прямые «спицы»;
   * - 'straight' — прямая под углом ветви (fishbone);
   * - 'fixed' — порт берётся с реального хэндла ребра как есть, без пересчёта.
   */
  edgeRouting: EdgeRouting;
  /**
   * Опциональный СЕМАНТИЧЕСКИЙ маршрут структурных рёбер этой раскладки: порты
   * и форма пути выводятся из смысла раскладки (шина оргструктуры, ось
   * таймлайна, хребет fishbone), а не из взаимного положения нод. Отсутствует —
   * работает общий routing по edgeRouting.
   */
  routeTreeEdge?: TreeRouteBuilder;
  /** Ключ i18n с короткой причиной запрета связи (тост при блокировке). */
  blockedReasonKey: TranslationKey;
  /**
   * Семантический предикат (НЕ геометрия): можно ли создать ребро source→target.
   * targetId может указывать на ещё не созданный узел (добавление потомка) —
   * такой узел трактуется как свежий лист без связей.
   */
  canConnect: (sourceId: string, targetId: string, ctx: ConnectContext) => boolean;
  /**
   * Чистая функция раскладки: (nodes, edges) => те же узлы с новыми позициями.
   * Не мутирует вход, не трогает рёбра/хэндлы, не возвращает NaN.
   */
  layout: (nodes: AppNode[], edges: AppEdge[]) => AppNode[];
}
