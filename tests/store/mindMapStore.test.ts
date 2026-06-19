import { describe, it, expect, beforeEach } from 'vitest';
import { useMindMapStore } from '../../src/store/mindMapStore';

describe('mindMapStore', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
  });

  it('инициализируется с одним корневым узлом', () => {
    const { nodes, edges } = useMindMapStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].data.isRoot).toBe(true);
    expect(edges).toHaveLength(0);
  });

  it('addChildNode добавляет узел и связь', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const childId = store.addChildNode(rootId);

    const state = useMindMapStore.getState();
    expect(childId).not.toBeNull();
    expect(state.nodes).toHaveLength(2);
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0]).toMatchObject({ source: rootId, target: childId });
    expect(state.isDirty).toBe(true);
  });

  it('addSiblingNode у корня возвращает null', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    expect(store.addSiblingNode(rootId)).toBeNull();
  });

  it('addSiblingNode добавляет узел тому же родителю', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const childId = store.addChildNode(rootId)!;
    const siblingId = useMindMapStore.getState().addSiblingNode(childId);

    const state = useMindMapStore.getState();
    expect(siblingId).not.toBeNull();
    expect(state.getParentId(siblingId!)).toBe(rootId);
    expect(state.nodes).toHaveLength(3);
  });

  it('deleteNode рекурсивно удаляет всех потомков', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const childId = store.addChildNode(rootId)!;
    const grandChildId = useMindMapStore.getState().addChildNode(childId)!;

    useMindMapStore.getState().deleteNode(childId);

    const state = useMindMapStore.getState();
    expect(state.nodes.find((n) => n.id === childId)).toBeUndefined();
    expect(state.nodes.find((n) => n.id === grandChildId)).toBeUndefined();
    expect(state.nodes).toHaveLength(1); // остался только корень
    expect(state.edges).toHaveLength(0);
  });

  it('deleteNode не удаляет корень', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    store.deleteNode(rootId);
    expect(useMindMapStore.getState().nodes).toHaveLength(1);
  });

  it('updateNodeLabel меняет текст и ставит isDirty', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    store.updateNodeLabel(rootId, 'Новый текст');
    const root = useMindMapStore.getState().getRootNode()!;
    expect(root.data.label).toBe('Новый текст');
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });

  it('getDescendantIds возвращает всех потомков', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const childA = store.addChildNode(rootId)!;
    const childB = useMindMapStore.getState().addChildNode(rootId)!;
    const grandChild = useMindMapStore.getState().addChildNode(childA)!;

    const descendants = useMindMapStore.getState().getDescendantIds(rootId);
    expect(descendants).toHaveLength(3);
    expect(descendants).toContain(childA);
    expect(descendants).toContain(childB);
    expect(descendants).toContain(grandChild);
  });
});
