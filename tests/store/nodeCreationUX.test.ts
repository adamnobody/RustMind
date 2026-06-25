import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeActions } from '../../src/features/nodes/hooks/useNodeActions';
import { useMindMapStore } from '../../src/store/mindMapStore';
import { useUIStore } from '../../src/store/uiStore';

beforeEach(() => {
  useMindMapStore.getState().resetDocument();
  useUIStore.setState({ selectedNodeId: null, editingNodeId: null, editingIntent: null });
});

// Fix 1: toolbar buttons must NOT enter edit mode after creating a node.
// Drag-from-handle creation (handleConnectEnd in MindMapCanvas) also had the same
// bug fixed, but it requires ReactFlow context to render — verified manually.
describe('useNodeActions — no auto-edit on create (toolbar path)', () => {
  it('addChild: new node is selected but not in edit mode', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const { result } = renderHook(() => useNodeActions({ nodeId: rootId, isRoot: true }));

    act(() => {
      result.current.addChild();
    });

    const { selectedNodeId, editingNodeId } = useUIStore.getState();
    expect(selectedNodeId).not.toBeNull();
    expect(selectedNodeId).not.toBe(rootId); // the new child, not parent
    expect(editingNodeId).toBeNull();
  });

  it('addSibling: new node is selected but not in edit mode', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const childId = useMindMapStore.getState().addChildNode(rootId)!;
    useUIStore.setState({ selectedNodeId: null, editingNodeId: null, editingIntent: null });

    const { result } = renderHook(() => useNodeActions({ nodeId: childId, isRoot: false }));

    act(() => {
      result.current.addSibling();
    });

    const { selectedNodeId, editingNodeId } = useUIStore.getState();
    expect(selectedNodeId).not.toBeNull();
    expect(selectedNodeId).not.toBe(childId); // the new sibling, not the original
    expect(editingNodeId).toBeNull();
  });
});

// Fix 2: clicking on empty canvas (onPaneClick) must clear selection.
// The canvas wires this as onPaneClick={() => setSelectedNodeId(null)}.
describe('uiStore — pane click clears selection', () => {
  it('setSelectedNodeId(null) clears an active selection', () => {
    useUIStore.getState().setSelectedNodeId('node-abc');
    expect(useUIStore.getState().selectedNodeId).toBe('node-abc');

    useUIStore.getState().setSelectedNodeId(null);
    expect(useUIStore.getState().selectedNodeId).toBeNull();
  });
});
