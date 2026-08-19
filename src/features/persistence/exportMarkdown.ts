import { isTreeEdge, type AppNode, type AppEdge, type Group } from '../../domain/mind-map';
import { findRoot, treeChildrenMap } from '../layout/strategies/shared';
import { generateNodeId, generateEdgeId } from '../../shared/lib/id';
import { NODE_COLORS } from '../../shared/lib/constants';
import { MIND_NODE_TYPE } from '../nodes/types';
import { DEFAULT_TREE_EDGE_HANDLES } from '../edges/types';

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

export interface OutlineNode {
  label: string;
  note?: string;
  children: OutlineNode[];
}

export interface MarkdownOutline {
  title?: string;
  roots: OutlineNode[];
}

export interface OutlineGraph {
  nodes: AppNode[];
  edges: AppEdge[];
  groups: Group[];
  documentName: string;
}

const LIST_RE = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const QUOTE_RE = /^(\s*)>\s?(.*)$/;
const H1_RE = /^#\s+(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const LINKS_HEADING = /^##\s+links\s*$/i;

function leadingSpaces(ws: string): number {
  let n = 0;
  for (const ch of ws) n += ch === '\t' ? 2 : 1;
  return n;
}

function forestFromHeadings(items: { level: number; label: string }[]): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: { level: number; node: OutlineNode }[] = [];
  for (const item of items) {
    const node: OutlineNode = { label: item.label, children: [] };
    while (stack.length > 0 && stack[stack.length - 1]!.level >= item.level) stack.pop();
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1]!.node.children.push(node);
    stack.push({ level: item.level, node });
  }
  return roots;
}

/** Markdown списка (и заголовков, если пунктов нет) → дерево оглавления. */
export function parseMarkdownOutline(markdown: string): MarkdownOutline {
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let title: string | undefined;
  const roots: OutlineNode[] = [];
  const stack: { depth: number; node: OutlineNode }[] = [];
  const headings: { level: number; label: string }[] = [];
  let sawList = false;

  for (const raw of lines) {
    const line = raw.replace(/[ \t]+$/, '');
    if (LINKS_HEADING.test(line.trim())) break;
    if (line.trim() === '') continue;

    const h1 = line.match(H1_RE);
    if (h1 && title === undefined && !sawList) {
      title = inline(h1[1]!);
      headings.push({ level: 1, label: title });
      continue;
    }

    const quote = line.match(QUOTE_RE);
    if (quote) {
      const last = stack.length > 0 ? stack[stack.length - 1]!.node : roots[roots.length - 1];
      if (last) {
        const row = quote[2] ?? '';
        last.note = last.note === undefined ? row : `${last.note}\n${row}`;
      }
      continue;
    }

    const list = line.match(LIST_RE);
    if (list) {
      sawList = true;
      const depth = Math.floor(leadingSpaces(list[1] ?? '') / 2);
      const node: OutlineNode = { label: inline(list[3] ?? ''), children: [] };
      while (stack.length > 0 && stack[stack.length - 1]!.depth >= depth) stack.pop();
      if (stack.length === 0) roots.push(node);
      else stack[stack.length - 1]!.node.children.push(node);
      stack.push({ depth, node });
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading && !sawList) {
      headings.push({ level: heading[1]!.length, label: inline(heading[2] ?? '') });
    }
  }

  if (!sawList && headings.length > 0) {
    return { title: headings.find((h) => h.level === 1)?.label ?? title, roots: forestFromHeadings(headings) };
  }
  return { title, roots };
}

function takeChild(item: OutlineNode, unused: AppNode[]): AppNode | undefined {
  const byLabel = unused.findIndex((n) => n.data.label === item.label);
  if (byLabel >= 0) return unused.splice(byLabel, 1)[0];
  return unused.shift();
}

function treeEdge(source: string, target: string, oldEdges: AppEdge[]): AppEdge {
  const prev = oldEdges.find((e) => isTreeEdge(e) && e.source === source && e.target === target);
  if (prev) return prev;
  return {
    id: generateEdgeId(source, target),
    source,
    target,
    type: 'mindEdge',
    sourceHandle: DEFAULT_TREE_EDGE_HANDLES.sourceHandle,
    targetHandle: DEFAULT_TREE_EDGE_HANDLES.targetHandle,
    data: { kind: 'tree' },
  };
}

/**
 * Текст оглавления → граф. Существующие узлы переиспользуются по подписи
 * среди сиблингов, иначе по порядку — стили не сбрасываются при правке списка.
 */
export function applyMarkdownToGraph(markdown: string, current: OutlineGraph): OutlineGraph {
  const parsed = parseMarkdownOutline(markdown);
  const documentName = parsed.title?.trim() ? parsed.title : current.documentName;
  if (parsed.roots.length === 0) {
    return { nodes: current.nodes, edges: current.edges, groups: current.groups, documentName };
  }

  const existingRoot = findRoot(current.nodes);
  const childrenMap = treeChildrenMap(current.nodes, current.edges);
  const byId = new Map(current.nodes.map((n) => [n.id, n]));
  const nodes: AppNode[] = [];
  const edges: AppEdge[] = [];

  const emit = (
    item: OutlineNode,
    existing: AppNode | undefined,
    parentId: string | null,
    order: number,
  ): void => {
    const isRoot = parentId === null;
    const parent = parentId ? nodes.find((n) => n.id === parentId) : undefined;
    const id = existing?.id ?? generateNodeId();
    const data: AppNode['data'] = existing
      ? { ...existing.data, label: item.label, order }
      : {
          label: item.label,
          order,
          ...(isRoot ? { isRoot: true, color: NODE_COLORS.root } : {}),
        };
    if (isRoot) data.isRoot = true;
    else delete data.isRoot;
    const note = item.note?.trim();
    if (note) data.note = item.note;
    else delete data.note;

    nodes.push({
      ...(existing ?? {
        type: MIND_NODE_TYPE,
        position: parent ? { x: parent.position.x + 200, y: parent.position.y } : { x: 0, y: 0 },
      }),
      id,
      type: existing?.type ?? MIND_NODE_TYPE,
      position: existing?.position ?? (parent ? { x: parent.position.x + 200, y: parent.position.y } : { x: 0, y: 0 }),
      data,
      selected: false,
      dragging: false,
    });

    if (parentId) edges.push(treeEdge(parentId, id, current.edges));

    const unused: AppNode[] = [];
    for (const cid of existing ? (childrenMap.get(existing.id) ?? []) : []) {
      const child = byId.get(cid);
      if (child) unused.push(child);
    }
    item.children.forEach((child, i) => emit(child, takeChild(child, unused), id, i));
  };

  if (parsed.roots.length === 1) {
    emit(parsed.roots[0]!, existingRoot, null, 0);
  } else {
    emit(
      {
        label: parsed.title?.trim() || existingRoot?.data.label || documentName,
        children: parsed.roots,
      },
      existingRoot,
      null,
      0,
    );
  }

  const keepIds = new Set(nodes.map((n) => n.id));
  for (const e of current.edges) {
    if (!isTreeEdge(e) && keepIds.has(e.source) && keepIds.has(e.target)) edges.push(e);
  }

  for (const n of nodes) {
    const folded = n.data.collapsedChildren;
    if (!folded) continue;
    const next = folded.filter((id) => keepIds.has(id));
    if (next.length > 0) n.data.collapsedChildren = next;
    else delete n.data.collapsedChildren;
  }

  const groups = current.groups
    .map((g) => ({ ...g, nodeIds: g.nodeIds.filter((id) => keepIds.has(id)) }))
    .filter((g) => g.nodeIds.length > 0);

  return { nodes, edges, groups, documentName };
}
