import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge } from '../../src/store/types';
import { resolveDropTarget } from '../../src/features/canvas/lib/dropTarget';

/** Корень R (220x56 в 0,0) с детьми A (order 0, 400,0) и B (order 1, 400,200). */
function makeGraph(): { nodes: AppNode[]; edges: AppEdge[] } {
  const nodes: AppNode[] = [
    { id: 'R', type: 'mindNode', position: { x: 0, y: 0 }, data: { label: 'R', isRoot: true, order: 0 } },
    { id: 'A', type: 'mindNode', position: { x: 400, y: 0 }, data: { label: 'A', order: 0 } },
    { id: 'B', type: 'mindNode', position: { x: 400, y: 200 }, data: { label: 'B', order: 1 } },
  ];
  const edges: AppEdge[] = [
    { id: 'e1', source: 'R', target: 'A', data: { kind: 'tree' } },
    { id: 'e2', source: 'R', target: 'B', data: { kind: 'tree' } },
  ];
  return { nodes, edges };
}

describe('resolveDropTarget', () => {
  it('курсор внутри рамки узла → reparent к нему', () => {
    const { nodes, edges } = makeGraph();
    const result = resolveDropTarget('B', { x: 450, y: 20 }, nodes, edges); // внутри A
    expect(result).toEqual({ kind: 'reparent', parentId: 'A' });
  });

  it('курсор рядом с узлом (не над ним) → reorder среди его сиблингов', () => {
    const { nodes, edges } = makeGraph();
    // draggedId 'X' не входит в граф — R/A/B все остаются кандидатами.
    // Ниже рамки A (y 0..48), но в радиусе — ближе к A, чем к B.
    const result = resolveDropTarget('X', { x: 490, y: 100 }, nodes, edges);
    expect(result.kind).toBe('reorder');
    if (result.kind === 'reorder') {
      expect(result.parentId).toBe('R');
      expect(result.index).toBe(1); // после A (order 0), перед B (order 1)
    }
  });

  it('курсор далеко от всех узлов → none (snap back)', () => {
    const { nodes, edges } = makeGraph();
    const result = resolveDropTarget('A', { x: 5000, y: 5000 }, nodes, edges);
    expect(result).toEqual({ kind: 'none' });
  });

  it('перетаскиваемый узел исключён из кандидатов (нельзя прикрепить к себе)', () => {
    const { nodes, edges } = makeGraph();
    // Курсор в старом центре A, но A — сам перетаскиваемый узел.
    const result = resolveDropTarget('A', { x: 490, y: 24 }, nodes, edges);
    expect(result.kind).not.toBe('reparent');
  });

  it('поддерево перетаскиваемого узла тоже исключено (запрет цикла на уровне кандидатов)', () => {
    const nodes: AppNode[] = [
      ...makeGraph().nodes,
      { id: 'C', type: 'mindNode', position: { x: 700, y: 0 }, data: { label: 'C', order: 0 } },
    ];
    const edges: AppEdge[] = [...makeGraph().edges, { id: 'e3', source: 'A', target: 'C', data: { kind: 'tree' } }];
    // Тащим A — его потомок C не должен быть валидной reparent-целью.
    const result = resolveDropTarget('A', { x: 750, y: 20 }, nodes, edges); // внутри C
    expect(result.kind).not.toBe('reparent');
  });

  it('перетаскивание корня: все узлы — его поддерево → none', () => {
    const { nodes, edges } = makeGraph();
    const result = resolveDropTarget('R', { x: 450, y: 20 }, nodes, edges);
    expect(result).toEqual({ kind: 'none' });
  });

  it('ближайший — корень без родителя → none (у корня нет сиблингов)', () => {
    const { nodes, edges } = makeGraph();
    const result = resolveDropTarget('A', { x: 110, y: 100 }, nodes, edges);
    expect(result).toEqual({ kind: 'none' });
  });

  it('reorder «до»: курсор выше центра ближайшего сиблинга → индекс перед ним', () => {
    const { nodes, edges } = makeGraph();
    // Чуть выше рамки B (y 200..248), ближе к B, чем к A.
    const result = resolveDropTarget('X', { x: 490, y: 160 }, nodes, edges);
    expect(result.kind).toBe('reorder');
    if (result.kind === 'reorder') {
      expect(result.parentId).toBe('R');
      expect(result.index).toBe(1); // перед B (order 1)
    }
  });
});
