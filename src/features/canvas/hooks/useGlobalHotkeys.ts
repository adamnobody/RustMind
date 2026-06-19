import { useEffect } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { isEditableTarget } from '../../../shared/lib/dom';

/**
 * Глобальные горячие клавиши для управления узлами.
 * Работают по выделенному узлу (selectedNodeId), когда НЕ идёт
 * инлайн-редактирование и фокус не в поле ввода.
 */
export function useGlobalHotkeys(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Читаем актуальное состояние напрямую из сторов (не через замыкание),
      // чтобы не пересоздавать обработчик на каждый рендер.
      const { selectedNodeId, editingNodeId, setSelectedNodeId, setEditingNodeId } =
        useUIStore.getState();
      const { nodes, addChildNode, addSiblingNode, deleteNode } =
        useMindMapStore.getState();

      // 1. Если идёт редактирование — глобальные хоткеи отключены
      //    (Enter/Escape внутри textarea обрабатываются локально в useNodeEditing)
      if (editingNodeId !== null) {
        return;
      }

      // 2. Если фокус в поле ввода (например, будущее поле имени документа) — пропускаем
      if (isEditableTarget(e.target)) {
        return;
      }

      // Helper: выделить + сразу редактировать новый узел
      const focusNew = (newId: string | null): void => {
        if (newId) {
          setSelectedNodeId(newId);
          setEditingNodeId(newId);
        }
      };

      switch (e.key) {
        case 'Tab': {
          // Tab всегда предотвращаем (чтобы не уводил фокус по DOM)
          e.preventDefault();
          if (selectedNodeId) {
            focusNew(addChildNode(selectedNodeId));
          }
          break;
        }

        case 'Enter': {
          if (selectedNodeId) {
            e.preventDefault();
            const newId = addSiblingNode(selectedNodeId);
            // У корня нет соседа (вернётся null) — тогда ничего не делаем
            focusNew(newId);
          }
          break;
        }

        case 'F2': {
          if (selectedNodeId) {
            e.preventDefault();
            setEditingNodeId(selectedNodeId);
          }
          break;
        }

        case 'Delete':
        case 'Backspace': {
          if (selectedNodeId) {
            e.preventDefault();
            // deleteNode сам игнорирует удаление корня, но здесь не сбрасываем
            // выделение корня, чтобы пользователь видел, что корень остался активен.
            const node = nodes.find((n) => n.id === selectedNodeId);
            const isRoot = node?.data.isRoot === true;
            if (!isRoot) {
              deleteNode(selectedNodeId);
              setSelectedNodeId(null);
            }
          }
          break;
        }

        case 'Escape': {
          // Снять выделение
          setSelectedNodeId(null);
          break;
        }

        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // пустые deps: используем getState(), обработчик стабилен
}
