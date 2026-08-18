import { describe, it, expect, beforeEach } from 'vitest';
import { requestNodeStatus } from '../../src/features/nodes/lib/requestNodeStatus';
import { useMindMapStore } from '../../src/store/mindMapStore';
import { useUIStore } from '../../src/store/uiStore';

describe('requestNodeStatus', () => {
  beforeEach(() => {
    useMindMapStore.getState().resetDocument();
    useUIStore.setState({ statusCascadePrompt: null });
  });

  it('лист сразу пишет статус без диалога', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const leaf = useMindMapStore.getState().addChildNode(rootId)!;

    requestNodeStatus(leaf, 'completed');

    expect(useUIStore.getState().statusCascadePrompt).toBeNull();
    expect(useMindMapStore.getState().nodes.find((n) => n.id === leaf)?.data.status).toBe(
      'completed',
    );
  });

  it('родитель открывает диалог и ещё не пишет статус', () => {
    const rootId = useMindMapStore.getState().getRootNode()!.id;
    const parent = useMindMapStore.getState().addChildNode(rootId)!;
    useMindMapStore.getState().addChildNode(parent);

    requestNodeStatus(parent, 'completed');

    expect(useUIStore.getState().statusCascadePrompt).toEqual({
      nodeId: parent,
      status: 'completed',
    });
    expect(useMindMapStore.getState().nodes.find((n) => n.id === parent)?.data.status).toBeUndefined();
  });
});
