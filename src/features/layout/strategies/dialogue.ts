import type { AppNode, AppEdge } from '../../../store/types';
import type { LayoutStrategy } from './types';
import { bfsOrder, nodeSize, withPositions } from './shared';

const LANE_X = 260; // половина расстояния между дорожками
const ROW_GAP = 40;

/**
 * Дорожка реплики: чередование по порядку обхода (корень — левая дорожка).
 * Функция общая для layout и canConnect, чтобы предикат и геометрия не разошлись.
 * Неизвестный узел (ещё не созданный потомок) считается следующим в порядке.
 */
function laneOf(nodeId: string, nodes: AppNode[], edges: AppEdge[]): 0 | 1 {
  const order = bfsOrder(nodes, edges);
  const index = order.findIndex((n) => n.id === nodeId);
  const effective = index === -1 ? order.length : index;
  return (effective % 2) as 0 | 1;
}

/**
 * Диалоговая карта: две вертикальные дорожки, реплики чередуются сверху вниз.
 * Связи — только между дорожками по ходу диалога (концы на разных дорожках).
 */
export const dialogueStrategy: LayoutStrategy = {
  kind: 'dialogue',
  nodeConstraint: 'soft',
  edgeConstraint: 'typed',
  blockedReasonKey: 'constraint.dialogue',
  canConnect: (sourceId, targetId, ctx) => {
    if (sourceId === targetId) return false;
    return laneOf(sourceId, ctx.nodes, ctx.edges) !== laneOf(targetId, ctx.nodes, ctx.edges);
  },
  layout: (nodes, edges) => {
    if (nodes.length === 0) return nodes;
    const ordered = bfsOrder(nodes, edges);
    const rowStep = Math.max(...ordered.map((n) => nodeSize(n).height)) + ROW_GAP;
    const positions = new Map<string, { x: number; y: number }>();
    ordered.forEach((node, i) => {
      positions.set(node.id, {
        x: i % 2 === 0 ? -LANE_X : LANE_X,
        y: i * rowStep,
      });
    });
    return withPositions(nodes, positions);
  },
};
