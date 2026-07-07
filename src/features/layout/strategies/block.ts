import type { LayoutStrategy } from './types';
import { bfsOrder, nodeSize, withPositions } from './shared';

const GAP_X = 60;
const GAP_Y = 48;

/**
 * Блок-структура: узлы выстраиваются в сетку (колонки), рёбра рисуются
 * ортогонально (углы 90° — за отрисовку отвечает MindEdge по layoutKind).
 * Связи любые — ограничение только визуальное.
 */
export const blockStrategy: LayoutStrategy = {
  kind: 'block',
  nodeConstraint: 'soft',
  edgeConstraint: 'any',
  blockedReasonKey: 'constraint.free',
  canConnect: () => true,
  layout: (nodes, edges) => {
    if (nodes.length === 0) return nodes;
    const ordered = bfsOrder(nodes, edges);
    const cols = Math.max(1, Math.ceil(Math.sqrt(ordered.length)));
    // Единый шаг сетки по максимальному размеру узла — колонки не «пляшут».
    let cellW = 0;
    let cellH = 0;
    for (const node of ordered) {
      const { width, height } = nodeSize(node);
      cellW = Math.max(cellW, width);
      cellH = Math.max(cellH, height);
    }
    const positions = new Map<string, { x: number; y: number }>();
    ordered.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(node.id, {
        x: col * (cellW + GAP_X),
        y: row * (cellH + GAP_Y),
      });
    });
    return withPositions(nodes, positions);
  },
};
