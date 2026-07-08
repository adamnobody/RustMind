import type { AppNode, AppEdge } from '../../../store/types';
import type { LayoutKind } from '../engines/layoutTypes';
import { isTreeEdge, DEFAULT_TREE_EDGE_HANDLES } from '../../edges/types';
import { generateEdgeId } from '../../../shared/lib/id';

export interface NormalizedStructure {
  nodes: AppNode[];
  edges: AppEdge[];
}

/**
 * Приводит документ к инвариантам структурной модели: ровно один корень, ровно
 * одно входящее структурное ребро на некорневой узел (BFS от корня — первое
 * найденное ребро сохраняется, дубликаты и циклы отбрасываются), недостижимые
 * узлы (сироты, изолированные поддеревья) цепляются прямо к корню синтетическим
 * ребром — так у каждого некорневого узла гарантированно есть ровно один
 * родитель. Каждому узлу назначается стабильный контактный order среди
 * сиблингов (сид — существующий data.order, иначе исходный порядок массива).
 * Free-связи не трогаются. Для 'network' и 'free' — no-op: там нет древесной
 * семантики (произвольные/циклические связи разрешены, позиции хранятся как
 * есть).
 */
export function normalizeStructure(
  nodes: AppNode[],
  edges: AppEdge[],
  layoutKind: LayoutKind,
): NormalizedStructure {
  if (nodes.length === 0 || layoutKind === 'network' || layoutKind === 'free') {
    return { nodes, edges };
  }

  const rootCandidates = nodes.filter((n) => n.data.isRoot);
  const rootId = (rootCandidates[0] ?? nodes[0]).id;

  const treeEdges = edges.filter(isTreeEdge);
  const outgoing = new Map<string, AppEdge[]>();
  for (const e of treeEdges) {
    const list = outgoing.get(e.source);
    if (list) list.push(e);
    else outgoing.set(e.source, [e]);
  }

  // BFS от корня: первое найденное входящее ребро — сохранённый родитель;
  // повторные входящие рёбра (дубликаты) и циклы отбрасываются естественно,
  // т.к. цель уже посещена.
  const keptEdgeByChild = new Map<string, AppEdge>();
  const visited = new Set<string>([rootId]);
  const bfsFrom = (seedId: string): void => {
    const queue: string[] = [seedId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const e of outgoing.get(current) ?? []) {
        if (visited.has(e.target)) continue;
        visited.add(e.target);
        keptEdgeByChild.set(e.target, e);
        queue.push(e.target);
      }
    }
  };
  bfsFrom(rootId);

  // Узлы, недостижимые от корня, могут сами формировать связные поддеревья
  // (изолированные ветки старых/битых файлов) — сохраняем их внутреннюю
  // структуру. Первый непосещённый узел каждой такой компоненты (в исходном
  // порядке массива) становится её локальным корнем и цепляется прямо к
  // глобальному корню синтетическим ребром; остальные узлы компоненты
  // сохраняют свои реальные внутренние родительские рёбра через тот же BFS.
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    visited.add(node.id); // локальный корень компоненты — родитель не найден, будет synthetic
    bfsFrom(node.id);
  }

  // Всё ещё недостижимые узлы (после обхода их локальных компонент) —
  // прямые дети корня по синтетическому ребру.
  const freeEdges = edges.filter((e) => !isTreeEdge(e));
  const finalTreeEdges: AppEdge[] = [];
  for (const node of nodes) {
    if (node.id === rootId) continue;
    const kept = keptEdgeByChild.get(node.id);
    finalTreeEdges.push(
      kept ?? {
        id: generateEdgeId(rootId, node.id),
        source: rootId,
        target: node.id,
        type: 'mindEdge',
        sourceHandle: DEFAULT_TREE_EDGE_HANDLES.sourceHandle,
        targetHandle: DEFAULT_TREE_EDGE_HANDLES.targetHandle,
        data: { kind: 'tree' },
      },
    );
  }

  // Order: сиблинги группируются по итоговому родителю, сортируются по
  // существующему order (сироты — в конец, по исходному порядку массива),
  // затем переиндексируются контактно 0..k-1.
  const childrenByParent = new Map<string, string[]>();
  for (const e of finalTreeEdges) {
    const list = childrenByParent.get(e.source);
    if (list) list.push(e.target);
    else childrenByParent.set(e.source, [e.target]);
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const arrayIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const orderById = new Map<string, number>([[rootId, 0]]);
  for (const children of childrenByParent.values()) {
    const sorted = [...children].sort((a, b) => {
      const oa = byId.get(a)?.data.order;
      const ob = byId.get(b)?.data.order;
      if (oa !== undefined && ob !== undefined && oa !== ob) return oa - ob;
      if (oa !== undefined && ob === undefined) return -1;
      if (oa === undefined && ob !== undefined) return 1;
      return (arrayIndex.get(a) ?? 0) - (arrayIndex.get(b) ?? 0);
    });
    sorted.forEach((id, i) => orderById.set(id, i));
  }

  const newNodes = nodes.map((n) => {
    // isRoot трогаем МИНИМАЛЬНО: выбранный корень получает true, лишние
    // экс-кандидаты (были true, но не выбраны) демоутятся; остальные узлы —
    // как есть (explicit false и undefined оба означают «не корень», не
    // нормализуем их друг в друга без необходимости).
    const isRoot = n.id === rootId ? true : n.data.isRoot === true ? undefined : n.data.isRoot;
    return { ...n, data: { ...n.data, isRoot, order: orderById.get(n.id) ?? 0 } };
  });

  return { nodes: newNodes, edges: [...finalTreeEdges, ...freeEdges] };
}
