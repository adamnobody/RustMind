import { useCallback, useEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { type NodeEditingIntent, useUIStore } from '../../../store/uiStore';

interface UseNodeEditingParams {
  nodeId: string;
  initialLabel: string;
}

interface UseNodeEditingResult {
  isEditing: boolean;
  draft: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  startEditing: (intent?: NodeEditingIntent) => void;
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
  const editingIntent = useUIStore((s) => s.editingIntent);
  const setEditingNodeId = useUIStore((s) => s.setEditingNodeId);
  const clearNodeEditing = useUIStore((s) => s.clearNodeEditing);
  const updateNodeLabel = useMindMapStore((s) => s.updateNodeLabel);

  const isEditing = editingNodeId === nodeId;
  const [draft, setDraft] = useState(initialLabel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Синхронизируем черновик с актуальным label при входе в режим
  useEffect(() => {
    if (isEditing) {
      const nextDraft =
        editingIntent?.mode === 'replace' ? (editingIntent.initialValue ?? '') : initialLabel;
      setDraft(nextDraft);
      // Фокус + выделение текста на следующем тике
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          if (editingIntent?.mode === 'replace') {
            el.setSelectionRange(nextDraft.length, nextDraft.length);
          } else {
            el.select();
          }
        }
      });
    }
  }, [editingIntent, isEditing, initialLabel]);

  const startEditing = useCallback(
    (intent: NodeEditingIntent = { mode: 'edit' }) => {
      setEditingNodeId(nodeId, intent);
    },
    [nodeId, setEditingNodeId],
  );

  const onChange = useCallback((value: string) => {
    setDraft(value);
  }, []);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    // Не сохраняем пустой label — откатываемся к исходному
    if (trimmed.length > 0 && trimmed !== initialLabel) {
      updateNodeLabel(nodeId, trimmed);
    }
    clearNodeEditing();
  }, [clearNodeEditing, draft, initialLabel, nodeId, updateNodeLabel]);

  const cancel = useCallback(() => {
    setDraft(initialLabel);
    clearNodeEditing();
  }, [clearNodeEditing, initialLabel]);

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
