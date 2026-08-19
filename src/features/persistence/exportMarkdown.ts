import { isTreeEdge, type AppNode, type AppEdge } from '../../domain/mind-map';
import { findRoot, treeChildrenMap } from '../layout/strategies/shared';

function inline(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Дерево карты → Markdown: вложенный список по структурным рёбрам,
 * заметки как цитаты, свободные связи отдельным блоком в конце.
 */
export function mapToMarkdown(nodes: AppNode[], edges: AppEdge[], title: string): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = treeChildrenMap(nodes, edges);
  const lines: string[] = [`# ${inline(title) || 'Untitled'}`, ''];
  const seen = new Set<string>();

  const walk = (id: string, depth: number): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const node = byId.get(id);
    if (!node) return;
    const pad = '  '.repeat(depth);
    lines.push(`${pad}- ${inline(node.data.label) || id}`);
    const note = node.data.note?.trim();
    if (note) {
      for (const row of note.split(/\r?\n/)) {
        lines.push(`${pad}  > ${row}`);
      }
    }
    for (const child of children.get(id) ?? []) walk(child, depth + 1);
  };

  const root = findRoot(nodes);
  if (root) walk(root.id, 0);
  for (const node of nodes) {
    if (!seen.has(node.id)) walk(node.id, 0);
  }

  const free = edges.filter((e) => !isTreeEdge(e));
  if (free.length > 0) {
    lines.push('', '## Links');
    for (const e of free) {
      const a = inline(byId.get(e.source)?.data.label ?? e.source);
      const b = inline(byId.get(e.target)?.data.label ?? e.target);
      const label = e.data?.style?.label?.trim();
      lines.push(`- ${a} → ${b}${label ? `: ${inline(label)}` : ''}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
