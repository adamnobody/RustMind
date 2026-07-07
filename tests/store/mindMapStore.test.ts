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

describe('mindMapStore — onConnect', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
    // Дефолт 'hierarchy' типизирован (canConnectAsTree) — эти тесты проверяют
    // общий механизм free-связей независимо от семантики раскладки, поэтому
    // переключаемся на network (edgeConstraint: 'any') напрямую, в обход
    // setLayoutType (чтобы не плодить лишнюю запись истории 'layout').
    useMindMapStore.setState({ layoutType: 'network' });
  });

  it('onConnect создаёт free-ребро с sourceHandle/targetHandle', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    store.addChildNode(rootId);
    const childId = useMindMapStore.getState().nodes.find((n) => !n.data.isRoot)!.id;

    useMindMapStore.getState().onConnect({
      source: childId,
      target: rootId,
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });

    const { edges } = useMindMapStore.getState();
    const assocEdge = edges.find((e) => e.source === childId && e.target === rootId);
    expect(assocEdge).toBeDefined();
    expect(assocEdge?.data?.kind).toBe('free');
    expect(assocEdge?.sourceHandle).toBe('top');
    expect(assocEdge?.targetHandle).toBe('bottom');
  });

  it('free-связь X→Y не делает Y потомком X (фильтр по kind)', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    // Два независимых потомка корня: X и Y (оба tree-рёбрами от корня).
    const xId = store.addChildNode(rootId)!;
    const yId = useMindMapStore.getState().addChildNode(rootId)!;

    // Рисуем ассоциативную связь X → Y.
    useMindMapStore.getState().onConnect({
      source: xId,
      target: yId,
      sourceHandle: 'right',
      targetHandle: 'left',
    });

    const state = useMindMapStore.getState();
    // Родитель Y — по-прежнему корень, а не X.
    expect(state.getParentId(yId)).toBe(rootId);
    // Y не входит в поддерево X.
    expect(state.getDescendantIds(xId)).not.toContain(yId);
    // Каскадное удаление X не уносит Y.
    useMindMapStore.getState().deleteNode(xId);
    const after = useMindMapStore.getState();
    expect(after.nodes.find((n) => n.id === yId)).toBeDefined();
    expect(after.nodes.find((n) => n.id === xId)).toBeUndefined();
  });

  it('onConnect записывает structural-снапшот в историю', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    store.addChildNode(rootId);
    const childId = useMindMapStore.getState().nodes.find((n) => !n.data.isRoot)!.id;

    const prevHistoryLen = useMindMapStore.getState().past.length;
    useMindMapStore.getState().onConnect({
      source: childId,
      target: rootId,
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });

    const { past } = useMindMapStore.getState();
    expect(past.length).toBeGreaterThan(prevHistoryLen);
    expect(past.at(-1)?.category).toBe('structural');
  });

  it('undo после onConnect убирает ассоциативное ребро', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    store.addChildNode(rootId);
    const childId = useMindMapStore.getState().nodes.find((n) => !n.data.isRoot)!.id;

    useMindMapStore.getState().onConnect({
      source: childId,
      target: rootId,
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });
    const edgesBefore = useMindMapStore.getState().edges.length;

    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().edges.length).toBe(edgesBefore - 1);
  });
});

describe('mindMapStore — projectSettings', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
  });

  it('инициализируется с DEFAULT_HANDLE_VISIBILITY (dashed)', () => {
    expect(useMindMapStore.getState().projectSettings.handleVisibility).toBe('dashed');
  });

  it('setProjectSettings обновляет handleVisibility и ставит isDirty', () => {
    useMindMapStore.getState().setProjectSettings({ handleVisibility: 'always' });
    const state = useMindMapStore.getState();
    expect(state.projectSettings.handleVisibility).toBe('always');
    expect(state.isDirty).toBe(true);
  });

  it('resetDocument сбрасывает projectSettings на дефолт', () => {
    useMindMapStore.getState().setProjectSettings({ handleVisibility: 'hidden' });
    useMindMapStore.getState().resetDocument();
    expect(useMindMapStore.getState().projectSettings.handleVisibility).toBe('dashed');
  });

  it('loadDocument восстанавливает projectSettings из payload', () => {
    useMindMapStore.getState().loadDocument({
      documentName: 'Test',
      layoutType: 'hierarchy',
      nodes: [],
      edges: [],
      projectSettings: { handleVisibility: 'hidden' },
    });
    expect(useMindMapStore.getState().projectSettings.handleVisibility).toBe('hidden');
  });

  it('loadDocument без projectSettings: дефолт (dashed)', () => {
    // Сначала выставляем не-дефолт
    useMindMapStore.getState().setProjectSettings({ handleVisibility: 'always' });
    // Загружаем документ без projectSettings (старый файл)
    useMindMapStore.getState().loadDocument({
      documentName: 'Old',
      layoutType: 'hierarchy',
      nodes: [],
      edges: [],
    });
    expect(useMindMapStore.getState().projectSettings.handleVisibility).toBe('dashed');
  });
});

describe('mindMapStore — хэндлы рёбер', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
    // network: edgeConstraint 'any' — нужен для onConnect(child→root) в третьем
    // тесте; остальным двум тестам блока тип раскладки не важен.
    useMindMapStore.setState({ layoutType: 'network' });
  });

  it('addChildNode с handles сохраняет переданный хэндл (drag-в-пустоту)', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const childId = store.addChildNode(rootId, { x: 0, y: -200 }, {
      sourceHandle: 'top',
      targetHandle: 'bottom',
    })!;

    const edge = useMindMapStore.getState().edges.find((e) => e.target === childId)!;
    expect(edge.sourceHandle).toBe('top');
    expect(edge.targetHandle).toBe('bottom');
    expect(edge.data?.kind).toBe('tree');
  });

  it('addChildNode без handles (Tab/Enter) — дефолт right/left', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const childId = store.addChildNode(rootId)!;

    const edge = useMindMapStore.getState().edges.find((e) => e.target === childId)!;
    expect(edge.sourceHandle).toBe('right');
    expect(edge.targetHandle).toBe('left');
  });

  it('auto-layout НЕ меняет хэндлы рёбер (ни tree с кастомным хэндлом, ни free)', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;

    // tree-ребёнок с нестандартным хэндлом 'bottom'
    const childId = store.addChildNode(rootId, { x: 0, y: 200 }, {
      sourceHandle: 'bottom',
      targetHandle: 'top',
    })!;
    // free-связь child → root с хэндлами 'left'/'right'
    useMindMapStore.getState().onConnect({
      source: childId,
      target: rootId,
      sourceHandle: 'left',
      targetHandle: 'right',
    });

    useMindMapStore.getState().applyAutoLayoutManual();

    const state = useMindMapStore.getState();
    const treeEdge = state.edges.find((e) => e.source === rootId && e.target === childId)!;
    const freeEdge = state.edges.find((e) => e.source === childId && e.target === rootId)!;
    expect(treeEdge.sourceHandle).toBe('bottom');
    expect(treeEdge.targetHandle).toBe('top');
    expect(freeEdge.sourceHandle).toBe('left');
    expect(freeEdge.targetHandle).toBe('right');
  });
});

describe('mindMapStore — setNodeStyle (in-memory prune)', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
  });

  it('применяет не-дефолтные поля стиля в объект узла', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().setNodeStyle(rootId, { shape: 'diamond', borderWidth: 3 });

    const node = useMindMapStore.getState().nodes.find((n) => n.id === rootId)!;
    expect(node.data.style).toEqual({ shape: 'diamond', borderWidth: 3 });
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });

  it('возврат поля к дефолту удаляет его ИЗ ОБЪЕКТА узла (не только из файла)', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;

    // Применяем не-дефолт...
    useMindMapStore.getState().setNodeStyle(rootId, { borderPattern: 'dashed' });
    expect(
      useMindMapStore.getState().nodes.find((n) => n.id === rootId)!.data.style,
    ).toEqual({ borderPattern: 'dashed' });

    // ...возвращаем к дефолту (solid). Поле должно ИСЧЕЗНУТЬ из style в памяти.
    useMindMapStore.getState().setNodeStyle(rootId, { borderPattern: 'solid' });
    const node = useMindMapStore.getState().nodes.find((n) => n.id === rootId)!;
    expect(node.data.style?.borderPattern).toBeUndefined();
  });

  it('возврат ВСЕХ полей к дефолту делает style пустым (undefined) в памяти', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;

    useMindMapStore.getState().setNodeStyle(rootId, { shape: 'ellipse', fontSize: 22 });
    // Возвращаем каждое поле к его дефолту из DEFAULT_NODE_STYLE.
    useMindMapStore.getState().setNodeStyle(rootId, { shape: 'rounded', fontSize: 14 });

    const node = useMindMapStore.getState().nodes.find((n) => n.id === rootId)!;
    expect(node.data.style).toBeUndefined();
  });

  it('явный undefined в патче убирает поле, не затирая остальные', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().setNodeStyle(rootId, { shape: 'diamond', borderWidth: 3 });
    useMindMapStore.getState().setNodeStyle(rootId, { borderWidth: undefined });

    const node = useMindMapStore.getState().nodes.find((n) => n.id === rootId)!;
    expect(node.data.style).toEqual({ shape: 'diamond' });
  });

  it('undefined для поля-С-ДЕФОЛТОМ → ключа нет вовсе (ни undefined, ни дефолт 1)', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().setNodeStyle(rootId, { shape: 'diamond' });
    useMindMapStore.getState().setNodeStyle(rootId, { borderWidth: undefined });

    const style = useMindMapStore.getState().nodes.find((n) => n.id === rootId)!.data.style;
    expect(style).toEqual({ shape: 'diamond' });
    // Именно отсутствие ключа, а не key=undefined и не key=1.
    expect('borderWidth' in (style ?? {})).toBe(false);
  });

  it("'none' для границы — не дефолт, остаётся в style", () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().setNodeStyle(rootId, { borderPattern: 'none' });

    const node = useMindMapStore.getState().nodes.find((n) => n.id === rootId)!;
    expect(node.data.style).toEqual({ borderPattern: 'none' });
  });

  it('серия правок стиля одного узла коалесится в одну запись истории', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const before = useMindMapStore.getState().past.length;

    useMindMapStore.getState().setNodeStyle(rootId, { borderWidth: 2 });
    useMindMapStore.getState().setNodeStyle(rootId, { borderWidth: 3 });
    useMindMapStore.getState().setNodeStyle(rootId, { borderWidth: 4 });

    expect(useMindMapStore.getState().past.length).toBe(before + 1);

    // Один undo откатывает всю серию — style возвращается к пустому.
    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().nodes.find((n) => n.id === rootId)!.data.style).toBeUndefined();
  });
});

describe('mindMapStore — setNodeHandleOffset (шаг 17)', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
  });

  it('сохраняет отклонение и ставит isDirty', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().setNodeHandleOffset(rootId, 'top', 20);

    const node = useMindMapStore.getState().nodes.find((n) => n.id === rootId)!;
    expect(node.data.handleOffsets).toEqual({ top: 20 });
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });

  it('возврат к центру (50) удаляет ключ; пустой объект → undefined', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().setNodeHandleOffset(rootId, 'left', 80);
    useMindMapStore.getState().setNodeHandleOffset(rootId, 'left', 50);

    const node = useMindMapStore.getState().nodes.find((n) => n.id === rootId)!;
    expect(node.data.handleOffsets).toBeUndefined();
  });

  it('клампит значение в 0–100 и округляет', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    useMindMapStore.getState().setNodeHandleOffset(rootId, 'right', 140);
    expect(
      useMindMapStore.getState().nodes.find((n) => n.id === rootId)!.data.handleOffsets,
    ).toEqual({ right: 100 });

    useMindMapStore.getState().setNodeHandleOffset(rootId, 'right', -7);
    expect(
      useMindMapStore.getState().nodes.find((n) => n.id === rootId)!.data.handleOffsets,
    ).toEqual({ right: 0 });
  });

  it('серия движений слайдера коалесится в одну запись истории', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const before = useMindMapStore.getState().past.length;

    useMindMapStore.getState().setNodeHandleOffset(rootId, 'top', 10);
    useMindMapStore.getState().setNodeHandleOffset(rootId, 'top', 20);
    useMindMapStore.getState().setNodeHandleOffset(rootId, 'top', 30);

    expect(useMindMapStore.getState().past.length).toBe(before + 1);

    useMindMapStore.getState().undo();
    expect(
      useMindMapStore.getState().nodes.find((n) => n.id === rootId)!.data.handleOffsets,
    ).toBeUndefined();
  });
});

describe('mindMapStore — setEdgeStyle / deleteEdges (шаг 15)', () => {
  /** Корень + потомок (tree-ребро) + free-связь потомок→корень. */
  function seedGraph(): { treeEdgeId: string; freeEdgeId: string } {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const childId = store.addChildNode(rootId)!;
    useMindMapStore.getState().onConnect({
      source: childId,
      target: rootId,
      sourceHandle: 'top',
      targetHandle: 'bottom',
    });
    const { edges } = useMindMapStore.getState();
    return {
      treeEdgeId: edges.find((e) => e.data?.kind !== 'free')!.id,
      freeEdgeId: edges.find((e) => e.data?.kind === 'free')!.id,
    };
  }

  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
    // network: edgeConstraint 'any' — seedGraph рисует free-связь child→root,
    // которую hierarchy (canConnectAsTree) блокирует (root не может быть целью).
    useMindMapStore.setState({ layoutType: 'network' });
  });

  it('применяет не-дефолтные поля и сохраняет kind ребра', () => {
    const { freeEdgeId } = seedGraph();
    useMindMapStore.getState().setEdgeStyle(freeEdgeId, { strokeWidth: 4, targetArrow: 'filled' });

    const edge = useMindMapStore.getState().edges.find((e) => e.id === freeEdgeId)!;
    expect(edge.data?.style).toEqual({ strokeWidth: 4, targetArrow: 'filled' });
    expect(edge.data?.kind).toBe('free');
    expect(useMindMapStore.getState().isDirty).toBe(true);
  });

  it('возврат поля к дефолту удаляет его из style (prune)', () => {
    const { freeEdgeId } = seedGraph();
    useMindMapStore.getState().setEdgeStyle(freeEdgeId, { linePattern: 'dashed' });
    useMindMapStore.getState().setEdgeStyle(freeEdgeId, { linePattern: 'solid' });

    const edge = useMindMapStore.getState().edges.find((e) => e.id === freeEdgeId)!;
    expect(edge.data?.style).toBeUndefined();
  });

  it('label: строка сохраняется, undefined убирает подпись', () => {
    const { treeEdgeId } = seedGraph();
    useMindMapStore.getState().setEdgeStyle(treeEdgeId, { label: 'зависит от' });
    expect(
      useMindMapStore.getState().edges.find((e) => e.id === treeEdgeId)!.data?.style?.label,
    ).toBe('зависит от');

    useMindMapStore.getState().setEdgeStyle(treeEdgeId, { label: undefined });
    expect(
      useMindMapStore.getState().edges.find((e) => e.id === treeEdgeId)!.data?.style,
    ).toBeUndefined();
  });

  it('deleteEdges удаляет free-связь и пишет structural-историю', () => {
    const { freeEdgeId } = seedGraph();
    const before = useMindMapStore.getState().past.length;

    useMindMapStore.getState().deleteEdges([freeEdgeId]);

    const state = useMindMapStore.getState();
    expect(state.edges.find((e) => e.id === freeEdgeId)).toBeUndefined();
    expect(state.past.length).toBe(before + 1);
    expect(state.past.at(-1)?.category).toBe('structural');

    useMindMapStore.getState().undo();
    expect(useMindMapStore.getState().edges.find((e) => e.id === freeEdgeId)).toBeDefined();
  });

  it('deleteEdges НЕ трогает структурные (tree) рёбра и не пишет историю впустую', () => {
    const { treeEdgeId } = seedGraph();
    const before = useMindMapStore.getState().past.length;

    useMindMapStore.getState().deleteEdges([treeEdgeId]);

    const state = useMindMapStore.getState();
    expect(state.edges.find((e) => e.id === treeEdgeId)).toBeDefined();
    expect(state.past.length).toBe(before);
  });
});

describe('mindMapStore — структурная модель (Tab/Enter, moveNode)', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
  });

  it('Tab (addChildNode) даёт валидную конечную позицию, не (0,0), после пересчёта', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const childId = store.addChildNode(rootId)!;

    const node = useMindMapStore.getState().nodes.find((n) => n.id === childId)!;
    expect(Number.isFinite(node.position.x)).toBe(true);
    expect(Number.isFinite(node.position.y)).toBe(true);
    expect(node.position).not.toEqual({ x: 0, y: 0 });
  });

  it('Enter (addSiblingNode) даёт валидную конечную позицию и order сразу после текущего', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const firstId = store.addChildNode(rootId)!;
    const siblingId = useMindMapStore.getState().addSiblingNode(firstId)!;

    const state = useMindMapStore.getState();
    const sibling = state.nodes.find((n) => n.id === siblingId)!;
    const first = state.nodes.find((n) => n.id === firstId)!;
    expect(Number.isFinite(sibling.position.x)).toBe(true);
    expect(Number.isFinite(sibling.position.y)).toBe(true);
    expect(sibling.data.order).toBe((first.data.order ?? 0) + 1);
  });

  it('несколько Tab подряд на одном родителе не перекрываются (разные order/позиции)', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const ids = [
      store.addChildNode(rootId)!,
      useMindMapStore.getState().addChildNode(rootId)!,
      useMindMapStore.getState().addChildNode(rootId)!,
    ];

    const nodes = useMindMapStore.getState().nodes.filter((n) => ids.includes(n.id));
    const orders = nodes.map((n) => n.data.order);
    expect(new Set(orders).size).toBe(3); // все order разные
    const positions = nodes.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(positions).size).toBe(3); // никто не наложился
  });

  it('moveNode реприкрепляет узел к новому родителю и пересчитывает позиции', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const aId = store.addChildNode(rootId)!;
    const bId = useMindMapStore.getState().addChildNode(rootId)!;

    const ok = useMindMapStore.getState().moveNode(bId, aId);
    expect(ok).toBe(true);

    const state = useMindMapStore.getState();
    expect(state.getParentId(bId)).toBe(aId);
    const b = state.nodes.find((n) => n.id === bId)!;
    expect(Number.isFinite(b.position.x)).toBe(true);
    expect(Number.isFinite(b.position.y)).toBe(true);
  });

  it('moveNode отклоняет цикл: нельзя прикрепить узел к собственному потомку', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const parentId = store.addChildNode(rootId)!;
    const childId = useMindMapStore.getState().addChildNode(parentId)!;

    const ok = useMindMapStore.getState().moveNode(parentId, childId);
    expect(ok).toBe(false);
    // Структура не изменилась.
    expect(useMindMapStore.getState().getParentId(parentId)).toBe(rootId);
  });

  it('moveNode отклоняет прикрепление узла к самому себе', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const aId = store.addChildNode(rootId)!;
    expect(useMindMapStore.getState().moveNode(aId, aId)).toBe(false);
  });

  it('moveNode отклоняет реприкрепление корня', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const aId = store.addChildNode(rootId)!;
    expect(useMindMapStore.getState().moveNode(rootId, aId)).toBe(false);
  });

  it('moveNode внутри того же родителя переставляет order (reorder)', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const aId = store.addChildNode(rootId)!;
    const bId = useMindMapStore.getState().addChildNode(rootId)!;

    // A и B — сиблинги корня; A изначально раньше B (order 0 < 1).
    useMindMapStore.getState().moveNode(aId, rootId, 1); // A встаёт после B
    const state = useMindMapStore.getState();
    const a = state.nodes.find((n) => n.id === aId)!;
    const b = state.nodes.find((n) => n.id === bId)!;
    expect(b.data.order).toBeLessThan(a.data.order!);
  });

  it('moveNode с skipHistory не добавляет отдельную запись истории (drag = один снапшот)', () => {
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const aId = store.addChildNode(rootId)!;
    const bId = useMindMapStore.getState().addChildNode(rootId)!;

    useMindMapStore.getState().pushHistory(); // как handleNodeDragStart
    const before = useMindMapStore.getState().past.length;
    useMindMapStore.getState().moveNode(bId, aId, undefined, { skipHistory: true });
    expect(useMindMapStore.getState().past.length).toBe(before);
  });

  it('network: позиции мягкие (drag/force-sim), моveNode не требуется — force-layout допускает циклы', () => {
    useMindMapStore.setState({ layoutType: 'network' });
    const store = useMindMapStore.getState();
    const rootId = store.getRootNode()!.id;
    const aId = store.addChildNode(rootId)!;

    // network canConnect всегда true — цикл A→root разрешён.
    useMindMapStore.getState().onConnect({ source: aId, target: rootId });
    const edge = useMindMapStore
      .getState()
      .edges.find((e) => e.source === aId && e.target === rootId);
    expect(edge).toBeDefined();
  });
});
