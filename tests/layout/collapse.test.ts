import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge } from '../../src/store/types';
import {
  collapsedHiddenIds,
  layoutExcludedIds,
} from '../../src/features/layout/strategies/shared';

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

describe('collapsedHiddenIds — per-branch (collapsedChildren)', () => {
  // R → (A, B); A → (A1, A2). У R свёрнута только ветка B; ветка A цела.
  function branchGraph(foldOnR: string[]): { nodes: AppNode[]; edges: AppEdge[] } {
    const R: AppNode = {
      id: 'R',
      type: 'mindNode',
      position: { x: 0, y: 0 },
      data: { label: 'R', collapsedChildren: foldOnR },
    };
    return {
      nodes: [R, node('A'), node('B'), node('A1'), node('A2')],
      edges: [edge('R', 'A'), edge('R', 'B'), edge('A', 'A1'), edge('A', 'A2')],
    };
  }

  it('сворачивает только указанную ветку (сам потомок + поддерево)', () => {
    const { nodes, edges } = branchGraph(['B']);
    const hidden = collapsedHiddenIds(nodes, edges);
    expect(hidden.has('B')).toBe(true); // свёрнутая ветка скрыта целиком (с узлом)
    expect(hidden.has('A')).toBe(false); // соседняя ветка не тронута
    expect(hidden.has('A1')).toBe(false);
    expect(hidden.has('A2')).toBe(false);
  });

  it('сворачивание ветки прячет её поддерево', () => {
    const { nodes, edges } = branchGraph(['A']);
    const hidden = collapsedHiddenIds(nodes, edges);
    expect(hidden.has('A')).toBe(true);
    expect(hidden.has('A1')).toBe(true);
    expect(hidden.has('A2')).toBe(true);
    expect(hidden.has('B')).toBe(false);
  });

  it('устаревший id (удалённый потомок) игнорируется', () => {
    const { nodes, edges } = branchGraph(['gone']);
    expect(collapsedHiddenIds(nodes, edges).size).toBe(0);
  });

  it('свёрнутая ветка остаётся в раскладке (держит слот), поддерево — нет', () => {
    // Прячем при рендере: сам потомок A + поддерево (A1,A2). Из раскладки же
    // убираем ТОЛЬКО поддерево — сам A держит слот, чтобы соседи не наехали.
    const { nodes, edges } = branchGraph(['A']);
    const hidden = collapsedHiddenIds(nodes, edges);
    const excluded = layoutExcludedIds(nodes, edges);
    expect(hidden.has('A')).toBe(true); // A скрыт при рендере
    expect(excluded.has('A')).toBe(false); // но остаётся в раскладке (слот за ним)
    expect(excluded.has('A1')).toBe(true); // поддерево из раскладки убрано
    expect(excluded.has('A2')).toBe(true);
  });
});
