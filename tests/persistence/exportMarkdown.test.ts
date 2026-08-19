import { describe, it, expect } from 'vitest';
import type { AppNode, AppEdge } from '../../src/domain/mind-map';
import {
  mapToMarkdown,
  parseMarkdownOutline,
  applyMarkdownToGraph,
} from '../../src/features/persistence/exportMarkdown';

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

describe('parseMarkdownOutline', () => {
  it('читает вложенный список, H1 и цитаты-заметки', () => {
    const parsed = parseMarkdownOutline(
      ['# My map', '', '- Root', '  - Alpha', '    > hello', '    > world', '  - Beta', ''].join('\n'),
    );
    expect(parsed.title).toBe('My map');
    expect(parsed.roots).toEqual([
      {
        label: 'Root',
        children: [
          { label: 'Alpha', note: 'hello\nworld', children: [] },
          { label: 'Beta', children: [] },
        ],
      },
    ]);
  });

  it('несколько верхних пунктов — лес; заголовки без списка тоже дерево', () => {
    const list = parseMarkdownOutline('# Title\n- A\n- B\n');
    expect(list.roots.map((r) => r.label)).toEqual(['A', 'B']);
    const heads = parseMarkdownOutline('# Title\n## A\n### a1\n## B\n');
    expect(heads.roots).toEqual([
      {
        label: 'Title',
        children: [
          { label: 'A', children: [{ label: 'a1', children: [] }] },
          { label: 'B', children: [] },
        ],
      },
    ]);
  });
});

describe('applyMarkdownToGraph', () => {
  it('round-trip через mapToMarkdown сохраняет подписи', () => {
    const nodes = [
      node('R', 'Root', { isRoot: true }),
      node('A', 'Alpha', { note: 'hello\nworld', order: 0 }),
      node('B', 'Beta', { order: 1 }),
    ];
    const edges = [tree('R', 'A'), tree('R', 'B')];
    const md = mapToMarkdown(nodes, edges, 'My map');
    const next = applyMarkdownToGraph(md, { nodes, edges, groups: [], documentName: 'My map' });
    expect(mapToMarkdown(next.nodes, next.edges, next.documentName)).toBe(md);
    expect(next.nodes.find((n) => n.data.label === 'Alpha')?.id).toBe('A');
  });

  it('переименовывает по порядку и не теряет стиль; новые пункты — новые id', () => {
    const nodes = [
      node('R', 'Root', { isRoot: true, style: { bold: true } }),
      node('A', 'Alpha', { order: 0, color: '#ff0' }),
    ];
    const edges = [tree('R', 'A')];
    const next = applyMarkdownToGraph('# Doc\n- Root\n  - Gamma\n  - New\n', {
      nodes,
      edges,
      groups: [],
      documentName: 'Doc',
    });
    const gamma = next.nodes.find((n) => n.data.label === 'Gamma')!;
    expect(gamma.id).toBe('A');
    expect(gamma.data.color).toBe('#ff0');
    expect(next.nodes.find((n) => n.data.isRoot)?.data.style).toEqual({ bold: true });
    expect(next.nodes.find((n) => n.data.label === 'New')?.id).not.toBe('A');
  });

  it('несколько верхних пунктов вешает их на корень из H1', () => {
    const nodes = [node('R', 'Old', { isRoot: true })];
    const next = applyMarkdownToGraph('# Project\n- Idea 1\n- Idea 2\n', {
      nodes,
      edges: [],
      groups: [],
      documentName: 'Old',
    });
    expect(next.documentName).toBe('Project');
    const root = next.nodes.find((n) => n.data.isRoot)!;
    expect(root.id).toBe('R');
    expect(root.data.label).toBe('Project');
    expect(next.nodes.map((n) => n.data.label).sort()).toEqual(['Idea 1', 'Idea 2', 'Project']);
  });
});
