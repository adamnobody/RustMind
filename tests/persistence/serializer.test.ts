import { describe, it, expect, beforeEach } from 'vitest';
import { serializeMindMap, deserializeMindMap } from '../../src/features/persistence/serializer';
import { useMindMapStore } from '../../src/store/mindMapStore';
import type { AppNode, AppEdge } from '../../src/store/types';

const makeNode = (id: string, isRoot = false): AppNode => ({
  id,
  type: 'mindNode',
  position: { x: 0, y: 0 },
  data: { label: `Node ${id}`, isRoot },
});

const makeEdge = (source: string, target: string): AppEdge => ({
  id: `edge_${source}__${target}`,
  source,
  target,
});

describe('serializer round-trip', () => {
  it('сериализует и восстанавливает узлы и рёбра', () => {
    const nodes: AppNode[] = [makeNode('root', true), makeNode('child1'), makeNode('child2')];
    const edges: AppEdge[] = [makeEdge('root', 'child1'), makeEdge('root', 'child2')];

    const serialized = serializeMindMap('Test Map', 'tree-LR', nodes, edges);
    const restored = deserializeMindMap(serialized);

    expect(restored.nodes).toHaveLength(3);
    expect(restored.edges).toHaveLength(2);
    expect(restored.documentName).toBe('Test Map');
    expect(restored.layoutType).toBe('tree-LR');

    for (let i = 0; i < nodes.length; i++) {
      expect(restored.nodes[i].id).toBe(nodes[i].id);
      expect(restored.nodes[i].data.label).toBe(nodes[i].data.label);
      expect(restored.nodes[i].data.isRoot).toBe(nodes[i].data.isRoot);
      expect(restored.nodes[i].type).toBe('mindNode');
    }
    for (let i = 0; i < edges.length; i++) {
      expect(restored.edges[i].id).toBe(edges[i].id);
      expect(restored.edges[i].source).toBe(edges[i].source);
      expect(restored.edges[i].target).toBe(edges[i].target);
    }
  });

  it('сохраняет createdAt при повторной сериализации', () => {
    const nodes: AppNode[] = [makeNode('root', true)];
    const first = serializeMindMap('Doc', 'tree-TB', nodes, []);
    const second = serializeMindMap('Doc', 'tree-TB', nodes, [], first.createdAt);

    expect(second.createdAt).toBe(first.createdAt);
    expect(second.version).toBe(1);
  });

  it('coerceLayoutType заменяет неизвестный тип на tree-LR', () => {
    const nodes: AppNode[] = [makeNode('root', true)];
    const serialized = serializeMindMap('Doc', 'unknown-layout', nodes, []);
    const restored = deserializeMindMap(serialized);
    expect(restored.layoutType).toBe('tree-LR');
  });

  it('round-trip через store: loadDocument восстанавливает состояние', () => {
    const store = useMindMapStore.getState();
    store.resetDocument();

    const rootId = store.getRootNode()!.id;
    const childId = store.addChildNode(rootId)!;
    useMindMapStore.getState().updateNodeLabel(childId, 'Дочерний узел');

    const state = useMindMapStore.getState();
    const serialized = serializeMindMap(
      state.documentName,
      state.layoutType,
      state.nodes,
      state.edges,
    );
    const payload = deserializeMindMap(serialized);

    store.resetDocument();
    useMindMapStore.getState().loadDocument(payload);

    const restoredState = useMindMapStore.getState();
    expect(restoredState.nodes).toHaveLength(2);
    expect(restoredState.edges).toHaveLength(1);
    expect(restoredState.isDirty).toBe(false);

    const restoredChild = restoredState.nodes.find((n) => n.id === childId);
    expect(restoredChild?.data.label).toBe('Дочерний узел');
  });
});

describe('isDirty tracking', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
  });

  it('isDirty = false после сброса', () => {
    expect(useMindMapStore.getState().isDirty).toBe(false);
  });

  it('isDirty = true после добавления узла', () => {
    const state = useMindMapStore.getState();
    state.addChildNode(state.getRootNode()!.id);
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });

  it('isDirty = true после изменения метки', () => {
    const state = useMindMapStore.getState();
    state.updateNodeLabel(state.getRootNode()!.id, 'Изменено');
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });

  it('isDirty = false после markSaved', () => {
    const state = useMindMapStore.getState();
    state.addChildNode(state.getRootNode()!.id);
    useMindMapStore.getState().markSaved();
    expect(useMindMapStore.getState().isDirty).toBe(false);
  });

  it('isDirty = false после loadDocument', () => {
    const state = useMindMapStore.getState();
    state.addChildNode(state.getRootNode()!.id);

    const payload = {
      documentName: 'Loaded',
      layoutType: 'tree-LR' as const,
      nodes: [makeNode('root', true)],
      edges: [],
    };
    useMindMapStore.getState().loadDocument(payload);
    expect(useMindMapStore.getState().isDirty).toBe(false);
  });

  it('isDirty = true после deleteNode', () => {
    const state = useMindMapStore.getState();
    const childId = state.addChildNode(state.getRootNode()!.id)!;
    useMindMapStore.getState().markSaved();
    useMindMapStore.getState().deleteNode(childId);
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });
});
