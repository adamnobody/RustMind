import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, isEditableSelection } from '../../src/store/uiStore';

function resetSelectionState(): void {
  useUIStore.setState({
    selectedNodeId: null,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    inspectorOpen: false,
    inspectorManuallyHidden: false,
  });
}

describe('uiStore — isEditableSelection (single element rule)', () => {
  it('ровно один узел и ноль рёбер → true', () => {
    expect(isEditableSelection(['n1'], [])).toBe(true);
  });

  it('ноль / много узлов или примесь рёбер → false (для шага 14)', () => {
    expect(isEditableSelection([], [])).toBe(false);
    expect(isEditableSelection(['n1', 'n2'], [])).toBe(false);
    expect(isEditableSelection(['n1'], ['e1'])).toBe(false);
    expect(isEditableSelection([], ['e1'])).toBe(false);
  });
});

describe('uiStore — inspector visibility', () => {
  beforeEach(resetSelectionState);

  it('выбор ровно одного узла авто-открывает панель', () => {
    useUIStore.getState().setSelection(['n1'], []);
    expect(useUIStore.getState().inspectorOpen).toBe(true);
    expect(useUIStore.getState().selectedNodeId).toBe('n1');
  });

  it('мультивыбор не открывает панель и НЕ ставит флаг ручного скрытия', () => {
    useUIStore.getState().setSelection(['n1', 'n2'], []);
    expect(useUIStore.getState().inspectorOpen).toBe(false);
    expect(useUIStore.getState().inspectorManuallyHidden).toBe(false);
  });

  it('одиночное ребро (без узла) не открывает узловую панель в шаге 14', () => {
    useUIStore.getState().setSelection([], ['e1']);
    expect(useUIStore.getState().inspectorOpen).toBe(false);
  });

  it('ручное скрытие перебивает авто-открытие при выборе ДРУГИХ узлов', () => {
    useUIStore.getState().setSelection(['n1'], []);
    expect(useUIStore.getState().inspectorOpen).toBe(true);

    useUIStore.getState().hideInspector();
    expect(useUIStore.getState().inspectorOpen).toBe(false);
    expect(useUIStore.getState().inspectorManuallyHidden).toBe(true);

    // Выбор другого узла НЕ должен всплывать панель.
    useUIStore.getState().setSelection(['n2'], []);
    expect(useUIStore.getState().inspectorOpen).toBe(false);
  });

  it('ручное открытие сбрасывает флаг скрытия и возвращает авто-открытие', () => {
    useUIStore.getState().setSelection(['n1'], []);
    useUIStore.getState().hideInspector();

    useUIStore.getState().openInspector();
    expect(useUIStore.getState().inspectorOpen).toBe(true);
    expect(useUIStore.getState().inspectorManuallyHidden).toBe(false);

    // Авто-открытие снова работает для следующих узлов.
    useUIStore.getState().setSelection([], []);
    useUIStore.getState().setSelection(['n3'], []);
    expect(useUIStore.getState().inspectorOpen).toBe(true);
  });

  it('снятие выбора мягко закрывает панель, но НЕ ставит флаг скрытия', () => {
    useUIStore.getState().setSelection(['n1'], []);
    expect(useUIStore.getState().inspectorOpen).toBe(true);

    useUIStore.getState().setSelection([], []);
    expect(useUIStore.getState().inspectorOpen).toBe(false);
    expect(useUIStore.getState().inspectorManuallyHidden).toBe(false);

    // Так как флаг не выставлен — повторный выбор узла снова открывает панель.
    useUIStore.getState().setSelection(['n2'], []);
    expect(useUIStore.getState().inspectorOpen).toBe(true);
  });

  it('toggleInspector: закрыто→открыто (ручное), открыто→скрыто (ручное)', () => {
    expect(useUIStore.getState().inspectorOpen).toBe(false);

    useUIStore.getState().toggleInspector();
    expect(useUIStore.getState().inspectorOpen).toBe(true);
    expect(useUIStore.getState().inspectorManuallyHidden).toBe(false);

    useUIStore.getState().toggleInspector();
    expect(useUIStore.getState().inspectorOpen).toBe(false);
    expect(useUIStore.getState().inspectorManuallyHidden).toBe(true);
  });

  it('setSelectedNodeId делегирует в setSelection (массивы + авто-открытие)', () => {
    useUIStore.getState().setSelectedNodeId('n1');
    expect(useUIStore.getState().selectedNodeIds).toEqual(['n1']);
    expect(useUIStore.getState().inspectorOpen).toBe(true);

    useUIStore.getState().setSelectedNodeId(null);
    expect(useUIStore.getState().selectedNodeIds).toEqual([]);
    expect(useUIStore.getState().inspectorOpen).toBe(false);
  });
});
