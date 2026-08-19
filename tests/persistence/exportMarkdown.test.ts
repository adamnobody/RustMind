import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge } from '../../src/domain/mind-map';
import { mapToMarkdown } from '../../src/features/persistence/exportMarkdown';

function node(id: string, label: string, extra?: Partial<AppNode['data']>): AppNode {
  return { id, position: { x: 0, y: 0 }, data: { label, ...extra } };
}

function tree(source: string, target: string): AppEdge {
  return { id: `${source}-${target}`, source, target, data: { kind: 'tree' } };
}

describe('mapToMarkdown', () => {
  it('кладёт дерево вложенным списком и заметку в цитату', () => {
    const nodes = [
      node('R', 'Root', { isRoot: true }),
      node('A', 'Alpha', { note: 'hello\nworld', order: 0 }),
      node('B', 'Beta', { order: 1 }),
    ];
    const edges = [tree('R', 'A'), tree('R', 'B')];
    const md = mapToMarkdown(nodes, edges, 'My map');
    expect(md).toBe(
      ['# My map', '', '- Root', '  - Alpha', '    > hello', '    > world', '  - Beta', ''].join('\n'),
    );
  });

  it('свободные связи — отдельный блок Links', () => {
    const nodes = [node('R', 'Root', { isRoot: true }), node('A', 'A'), node('B', 'B')];
    const edges: AppEdge[] = [
      tree('R', 'A'),
      tree('R', 'B'),
      { id: 'f', source: 'A', target: 'B', data: { kind: 'free', style: { label: 'see also' } } },
    ];
    const md = mapToMarkdown(nodes, edges, 'Doc');
    expect(md).toContain('## Links');
    expect(md).toContain('- A → B: see also');
  });
});
