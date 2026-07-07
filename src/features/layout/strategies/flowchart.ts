import { layoutTree } from '../lib/layoutTree';
import type { LayoutStrategy } from './types';
import { hasDirectedPath } from './shared';

/**
 * Блок-схема: направленный поток сверху вниз (Dagre TB по ВСЕМ рёбрам — free-
 * связи здесь полноценные ветвления, напр. «да/нет» от ромба-решения через
 * label). Типизация узлов — существующими формами NodeStyle (rounded/diamond/
 * rectangle); ветвления подписываются через label ребра. Ограничение потока:
 * без циклов (по всем направленным рёбрам); несколько входящих/исходящих
 * разрешены — у ромба может (и должно) быть ≥2 исходящих.
 */
export const flowchartStrategy: LayoutStrategy = {
  kind: 'flowchart',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  blockedReasonKey: 'constraint.flowchart',
  canConnect: (sourceId, targetId, ctx) => {
    if (sourceId === targetId) return false;
    // Ребро source→target замкнёт цикл, если уже есть путь target→source.
    return !hasDirectedPath(targetId, sourceId, ctx.edges);
  },
  layout: (nodes, edges) => layoutTree(nodes, edges, { direction: 'TB' }),
};
