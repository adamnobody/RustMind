import type { LayoutStrategy } from './types';

/**
 * Свободный режим: никаких ограничений — позиции только те, что задал
 * пользователь (drag), раскладка их не пересчитывает; связи любые, без
 * структурной семантики (как network, но без force-directed пересборки).
 */
export const freeStrategy: LayoutStrategy = {
  kind: 'free',
  nodeConstraint: 'soft',
  edgeConstraint: 'any',
  positionMode: 'stored',
  edgeRouting: 'bezier',
  blockedReasonKey: 'constraint.free',
  canConnect: () => true,
  layout: (nodes) => nodes,
};
