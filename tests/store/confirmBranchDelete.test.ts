import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useMindMapStore } from '../../src/store/mindMapStore';
import { useUIStore } from '../../src/store/uiStore';

function setConfirmBranchDelete(value: boolean): void {
  useUIStore.setState((s) => ({ settings: { ...s.settings, confirmBranchDelete: value } }));
}

/** root → child → grandChild: child — ветка с потомком, grandChild — лист. */
function buildBranch(): { rootId: string; childId: string; grandChildId: string } {
  const store = useMindMapStore.getState();
  const rootId = store.getRootNode()!.id;
  const childId = store.addChildNode(rootId)!;
  const grandChildId = useMindMapStore.getState().addChildNode(childId)!;
  return { rootId, childId, grandChildId };
}

describe('confirmBranchDelete — подтверждение удаления ветки', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
    setConfirmBranchDelete(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setConfirmBranchDelete(false);
  });

  it('настройка выкл: ветка удаляется без подтверждения', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { childId } = buildBranch();

    useMindMapStore.getState().deleteNode(childId);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(useMindMapStore.getState().nodes.find((n) => n.id === childId)).toBeUndefined();
  });

  it('настройка вкл + отмена: ветка остаётся, история undo не пишется', () => {
    setConfirmBranchDelete(true);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { childId, grandChildId } = buildBranch();
    const undoDepthBefore = useMindMapStore.getState().past.length;

    useMindMapStore.getState().deleteNode(childId);

    const state = useMindMapStore.getState();
    expect(state.nodes.find((n) => n.id === childId)).toBeDefined();
    expect(state.nodes.find((n) => n.id === grandChildId)).toBeDefined();
    expect(state.past.length).toBe(undoDepthBefore);
    expect(state.canUndo).toBe(undoDepthBefore > 0);
  });

  it('настройка вкл + подтверждение: ветка удаляется, undo её возвращает', () => {
    setConfirmBranchDelete(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { childId, grandChildId } = buildBranch();

    useMindMapStore.getState().deleteNode(childId);

    let state = useMindMapStore.getState();
    expect(state.nodes.find((n) => n.id === childId)).toBeUndefined();
    expect(state.nodes.find((n) => n.id === grandChildId)).toBeUndefined();

    state.undo();
    state = useMindMapStore.getState();
    expect(state.nodes.find((n) => n.id === childId)).toBeDefined();
    expect(state.nodes.find((n) => n.id === grandChildId)).toBeDefined();
  });

  it('настройка вкл: одиночный узел без потомков удаляется без подтверждения', () => {
    setConfirmBranchDelete(true);
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { grandChildId } = buildBranch();

    useMindMapStore.getState().deleteNode(grandChildId);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(useMindMapStore.getState().nodes.find((n) => n.id === grandChildId)).toBeUndefined();
  });

  it('настройка вкл: корень не удаляется и подтверждение не спрашивается', () => {
    setConfirmBranchDelete(true);
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { rootId } = buildBranch();

    useMindMapStore.getState().deleteNode(rootId);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(useMindMapStore.getState().nodes.find((n) => n.id === rootId)).toBeDefined();
  });
});
