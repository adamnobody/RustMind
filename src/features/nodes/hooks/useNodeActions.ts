import { useCallback } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';

interface UseNodeActionsParams {
  nodeId: string;
  isRoot: boolean;
}

interface UseNodeActionsResult {
  addChild: () => void;
  addSibling: () => void;
  remove: () => void;
  canAddSibling: boolean;
  canDelete: boolean;
}

export function useNodeActions({
  nodeId,
  isRoot,
}: UseNodeActionsParams): UseNodeActionsResult {
  const addChildNode = useMindMapStore((s) => s.addChildNode);
  const addSiblingNode = useMindMapStore((s) => s.addSiblingNode);
  const deleteNode = useMindMapStore((s) => s.deleteNode);

  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const setEditingNodeId = useUIStore((s) => s.setEditingNodeId);

  // После создания: выделяем новый узел и сразу открываем редактирование
  const focusNewNode = useCallback(
    (newId: string | null) => {
      if (newId) {
        setSelectedNodeId(newId);
        setEditingNodeId(newId);
      }
    },
    [setSelectedNodeId, setEditingNodeId],
  );

  const addChild = useCallback(() => {
    const newId = addChildNode(nodeId);
    focusNewNode(newId);
  }, [addChildNode, nodeId, focusNewNode]);

  const addSibling = useCallback(() => {
    const newId = addSiblingNode(nodeId);
    focusNewNode(newId);
  }, [addSiblingNode, nodeId, focusNewNode]);

  const remove = useCallback(() => {
    deleteNode(nodeId);
    setSelectedNodeId(null);
  }, [deleteNode, nodeId, setSelectedNodeId]);

  return {
    addChild,
    addSibling,
    remove,
    canAddSibling: !isRoot, // у корня нет соседей
    canDelete: !isRoot, // корень нельзя удалить
  };
}
