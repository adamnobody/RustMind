import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useMindMapStore } from '../../src/store/mindMapStore';
import { useUIStore } from '../../src/store/uiStore';

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

describe('mindMapStore — undo/redo', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
  });

  it('после resetDocument история пуста, флаги выключены', () => {
    const s = useMindMapStore.getState();
    expect(s.past).toHaveLength(0);
    expect(s.future).toHaveLength(0);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
  });

  it('add → undo убирает узел, redo возвращает', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const childId = useMindMapStore.getState().addChildNode(rootId)!;

    expect(useMindMapStore.getState().nodes).toHaveLength(2);
    expect(useMindMapStore.getState().canUndo).toBe(true);

    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().nodes).toHaveLength(1);
    expect(useMindMapStore.getState().nodes.find((n) => n.id === childId)).toBeUndefined();
    expect(useMindMapStore.getState().canUndo).toBe(false);
    expect(useMindMapStore.getState().canRedo).toBe(true);

    useMindMapStore.getState().redo();
    expect(useMindMapStore.getState().nodes).toHaveLength(2);
    expect(useMindMapStore.getState().nodes.find((n) => n.id === childId)).toBeDefined();
    expect(useMindMapStore.getState().canRedo).toBe(false);
  });

  it('edit text → undo/redo восстанавливает текст', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const original = useMindMapStore.getState().getRootNode()!.data.label;

    useMindMapStore.getState().updateNodeLabel(rootId, 'Изменённый');
    expect(useMindMapStore.getState().getRootNode()!.data.label).toBe('Изменённый');

    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().getRootNode()!.data.label).toBe(original);

    useMindMapStore.getState().redo();
    expect(useMindMapStore.getState().getRootNode()!.data.label).toBe('Изменённый');
  });

  it('delete → undo восстанавливает узел и его связи', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const childId = useMindMapStore.getState().addChildNode(rootId)!;
    const grandChildId = useMindMapStore.getState().addChildNode(childId)!;

    useMindMapStore.getState().deleteNode(childId);
    expect(useMindMapStore.getState().nodes).toHaveLength(1);
    expect(useMindMapStore.getState().edges).toHaveLength(0);

    useMindMapStore.getState().undo();
    const restored = useMindMapStore.getState();
    expect(restored.nodes.find((n) => n.id === childId)).toBeDefined();
    expect(restored.nodes.find((n) => n.id === grandChildId)).toBeDefined();
    expect(restored.edges).toHaveLength(2);
    expect(restored.getParentId(childId)).toBe(rootId);
    expect(restored.getParentId(grandChildId)).toBe(childId);
  });

  it('коалесинг: подряд правки одного узла — одна запись истории', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const original = useMindMapStore.getState().getRootNode()!.data.label;

    useMindMapStore.getState().updateNodeLabel(rootId, 'a');
    useMindMapStore.getState().updateNodeLabel(rootId, 'ab');
    useMindMapStore.getState().updateNodeLabel(rootId, 'abc');

    expect(useMindMapStore.getState().past).toHaveLength(1);

    // Один undo откатывает всю серию печати к исходному значению.
    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().getRootNode()!.data.label).toBe(original);
  });

  it('правки разных узлов дают отдельные записи', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const childId = useMindMapStore.getState().addChildNode(rootId)!;

    const before = useMindMapStore.getState().past.length;
    useMindMapStore.getState().updateNodeLabel(rootId, 'корень');
    useMindMapStore.getState().updateNodeLabel(childId, 'ребёнок');
    expect(useMindMapStore.getState().past.length).toBe(before + 2);
  });

  it('новое действие после undo очищает future', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().addChildNode(rootId);

    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().future).toHaveLength(1);
    expect(useMindMapStore.getState().canRedo).toBe(true);

    // Новое undoable-действие после отката должно стереть future.
    useMindMapStore.getState().addChildNode(rootId);
    expect(useMindMapStore.getState().future).toHaveLength(0);
    expect(useMindMapStore.getState().canRedo).toBe(false);
  });

  it('история ограничена лимитом и не растёт бесконечно', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    for (let i = 0; i < 130; i++) {
      useMindMapStore.getState().addChildNode(rootId);
    }
    expect(useMindMapStore.getState().past.length).toBeLessThanOrEqual(100);
  });

  it('undo/redo на пустых стеках — безопасный no-op', () => {
    const before = useMindMapStore.getState().nodes.length;
    useMindMapStore.getState().undo();
    useMindMapStore.getState().redo();
    expect(useMindMapStore.getState().nodes).toHaveLength(before);
  });
});

describe('mindMapStore — fitView при undo/redo по категории', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useMindMapStore.getState().resetDocument();
  });

  afterEach(() => {
    vi.useRealTimers();
    useUIStore.getState().registerFitView(() => {});
  });

  it('text-undo НЕ вызывает fitView', () => {
    const fit = vi.fn();
    useUIStore.getState().registerFitView(fit);

    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().updateNodeLabel(rootId, 'Текст');

    useMindMapStore.getState().undo();
    vi.runAllTimers();
    expect(fit).not.toHaveBeenCalled();

    useMindMapStore.getState().redo();
    vi.runAllTimers();
    expect(fit).not.toHaveBeenCalled();
  });

  it('structural-undo/redo вызывает fitView', () => {
    const fit = vi.fn();
    useUIStore.getState().registerFitView(fit);

    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().addChildNode(rootId);

    useMindMapStore.getState().undo();
    vi.runAllTimers();
    expect(fit).toHaveBeenCalledTimes(1);

    useMindMapStore.getState().redo();
    vi.runAllTimers();
    expect(fit).toHaveBeenCalledTimes(2);
  });

  it('layout-undo вызывает fitView', () => {
    const fit = vi.fn();
    useUIStore.getState().registerFitView(fit);

    useMindMapStore.getState().applyAutoLayoutManual();
    useMindMapStore.getState().undo();
    vi.runAllTimers();
    expect(fit).toHaveBeenCalledTimes(1);
  });
});
