import type { AppNode, AppEdge } from '../../../store/types';
import type { LayoutKind } from '../engines/layoutTypes';
import type { TranslationKey } from '../../../shared/i18n/translations';

/**
 * Декларации ограничений раскладки (БЛОК 0):
 * - nodeConstraint — всегда мягкий: drag разрешён при любой раскладке, форма
 *   не удерживается силой и восстанавливается пересборкой. 'free' означает,
 *   что у раскладки вообще нет собственной формы (позиции как есть).
 * - edgeConstraint — жёсткий: 'typed' раскладка блокирует СОЗДАНИЕ рёбер,
 *   нарушающих семантику типа (предикат canConnect). Существующие невалидные
 *   рёбра не удаляются — только помечаются визуально.
 */
export type NodeConstraint = 'free' | 'soft';
export type EdgeConstraint = 'any' | 'typed';

export interface ConnectContext {
  nodes: AppNode[];
  edges: AppEdge[];
}

export interface LayoutStrategy {
  kind: LayoutKind;
  nodeConstraint: NodeConstraint;
  edgeConstraint: EdgeConstraint;
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
