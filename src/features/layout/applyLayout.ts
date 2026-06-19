import type { AppNode, AppEdge, LayoutType } from '../../store/types';

/**
 * ВРЕМЕННАЯ ЗАГЛУШКА. Полноценная реализация через dagre — на шаге 8.
 * Сейчас возвращает узлы без изменений, чтобы стор компилировался и работал.
 */
export function applyLayout(
  nodes: AppNode[],
  edges: AppEdge[],
  _layoutType: LayoutType,
): { nodes: AppNode[]; edges: AppEdge[] } {
  return { nodes, edges };
}
