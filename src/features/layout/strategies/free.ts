import type { LayoutStrategy } from './types';

/**
 * Свободный режим — нулевой (текущее поведение приложения как один из режимов):
 * позиции как есть, раскладка ничего не пересчитывает, любые связи разрешены.
 */
export const freeStrategy: LayoutStrategy = {
  kind: 'free',
  nodeConstraint: 'free',
  edgeConstraint: 'any',
  blockedReasonKey: 'constraint.free',
  canConnect: () => true,
  layout: (nodes) => nodes,
};
