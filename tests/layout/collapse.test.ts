import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge } from '../../src/store/types';
import { collapsedHiddenIds } from '../../src/features/layout/strategies/shared';

function node(id: string, collapsed = false): AppNode {
  return { id, type: 'mindNode', position: { x: 0, y: 0 }, data: { label: id, collapsed } };
}
function edge(source: string, target: string): AppEdge {
  return { id: `t_${source}_${target}`, source, target, data: { kind: 'tree' } };
}

// R → A → (A1, A2); R → B. A свёрнут.
function graph(collapseA: boolean): { nodes: AppNode[]; edges: AppEdge[] } {
  return {
    nodes: [node('R'), node('A', collapseA), node('A1'), node('A2'), node('B')],
    edges: [edge('R', 'A'), edge('A', 'A1'), edge('A', 'A2'), edge('R', 'B')],
  };
}

describe('collapsedHiddenIds', () => {
  it('скрывает всё поддерево свёрнутого узла, но не сам узел', () => {
    const { nodes, edges } = graph(true);
    const hidden = collapsedHiddenIds(nodes, edges);
    expect(hidden.has('A')).toBe(false); // сам свёрнутый узел виден
    expect(hidden.has('A1')).toBe(true);
    expect(hidden.has('A2')).toBe(true);
    expect(hidden.has('B')).toBe(false); // не потомок A
  });

  it('без свёрнутых узлов ничего не скрыто', () => {
    const { nodes, edges } = graph(false);
    expect(collapsedHiddenIds(nodes, edges).size).toBe(0);
  });
});
