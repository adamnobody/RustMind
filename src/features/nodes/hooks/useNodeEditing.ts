import { useCallback, useEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';

interface UseNodeEditingParams {
  nodeId: string;
  initialLabel: string;
}

interface UseNodeEditingResult {
  isEditing: boolean;
  draft: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  startEditing: () => void;
  onChange: (value: string) => void;
  commit: () => void;
  cancel: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function useNodeEditing({
  nodeId,
  initialLabel,
}: UseNodeEditingParams): UseNodeEditingResult {
  const editingNodeId = useUIStore((s) => s.editingNodeId);
  const setEditingNodeId = useUIStore((s) => s.setEditingNodeId);
  const updateNodeLabel = useMindMapStore((s) => s.updateNodeLabel);

  const isEditing = editingNodeId === nodeId;
  const [draft, setDraft] = useState(initialLabel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Синхронизируем черновик с актуальным label при входе в режим
  useEffect(() => {
    if (isEditing) {
      setDraft(initialLabel);
      // Фокус + выделение текста на следующем тике
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      });
    }
  }, [isEditing, initialLabel]);

  const startEditing = useCallback(() => {
    setEditingNodeId(nodeId);
  }, [nodeId, setEditingNodeId]);

  const onChange = useCallback((value: string) => {
    setDraft(value);
  }, []);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    // Не сохраняем пустой label — откатываемся к исходному
    if (trimmed.length > 0 && trimmed !== initialLabel) {
      updateNodeLabel(nodeId, trimmed);
    }
    setEditingNodeId(null);
  }, [draft, initialLabel, nodeId, updateNodeLabel, setEditingNodeId]);

  const cancel = useCallback(() => {
    setDraft(initialLabel);
    setEditingNodeId(null);
  }, [initialLabel, setEditingNodeId]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter без Shift — сохранить; Shift+Enter — перенос строки
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
      // Останавливаем всплытие, чтобы глобальные хоткеи не срабатывали
      e.stopPropagation();
    },
    [commit, cancel],
  );

  return {
    isEditing,
    draft,
    textareaRef,
    startEditing,
    onChange,
    commit,
    cancel,
    onKeyDown,
  };
}
