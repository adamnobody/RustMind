import { useEffect } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { isEditableTarget } from '../../../shared/lib/dom';

function isPrintableCharacter(e: KeyboardEvent): boolean {
  return !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && e.key.trim().length > 0;
}

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
      const {
        selectedNodeId,
        editingNodeId,
        editingGroupId,
        selectedGroupId,
        setSelectedNodeId,
        setEditingNodeId,
        setEditingGroupId,
        statusCascadePrompt,
        outlineOpen,
      } = useUIStore.getState();
      const { nodes, addChildNode, addSiblingNode, deleteNode, undo, redo } =
        useMindMapStore.getState();

      if (outlineOpen) return;

      // 1. Если идёт редактирование — глобальные хоткеи отключены
      //    (Enter/Escape внутри textarea обрабатываются локально в useNodeEditing)
      if (editingNodeId !== null || editingGroupId !== null || statusCascadePrompt !== null) {
        return;
      }

      // 2. Если фокус в поле ввода (например, будущее поле имени документа) — пропускаем.
      //    Внутри textarea Ctrl+Z остаётся нативным undo, граф не трогаем.
      if (isEditableTarget(e.target)) {
        return;
      }

      // 3. Undo / Redo графа (изолированы от редактора шагами 1–2 выше).
      //    Ctrl/Cmd+Z — undo; Ctrl/Cmd+Shift+Z или Ctrl/Cmd+Y — redo.
      //    Сравниваем по e.code (физическая клавиша), а не e.key: при кириллице
      //    e.key для клавиши Z = 'я', и сравнение с 'z' провалилось бы.
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        redo();
        return;
      }

      // Поиск по узлам — Ctrl/Cmd+F.
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
        e.preventDefault();
        useUIStore.getState().toggleSearch();
        return;
      }

      // Группировка выделенных узлов — Ctrl/Cmd+G (нужно ≥2 узла).
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyG') {
        e.preventDefault();
        const { selectedNodeIds, setSelectedGroupId } = useUIStore.getState();
        if (selectedNodeIds.length >= 2) {
          const gid = useMindMapStore.getState().createGroup(selectedNodeIds);
          if (gid) {
            setSelectedGroupId(gid);
            useUIStore.getState().setEditingGroupId(gid);
          }
        }
        return;
      }

      // Авто-раскладка — L (без модификаторов), то же действие, что пункт
      // меню «Правка → Авто-раскладка»: имеет смысл только для network
      // (форс-симуляция), поэтому и пункт меню, и хоткей живут только там.
      // Стоит до switch: в network L перехватывает printable-quick-edit.
      // e.code (физическая клавиша), чтобы работало и на кириллице ('д').
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.code === 'KeyL') {
        const { layoutType, applyAutoLayoutManual } = useMindMapStore.getState();
        if (layoutType === 'network') {
          e.preventDefault();
          applyAutoLayoutManual();
          setTimeout(() => useUIStore.getState().triggerFitView(), 50);
          return;
        }
      }

      // Helper: выделить новый узел без авто-редактирования — быстрый наброс структуры.
      const focusNew = (newId: string | null): void => {
        if (newId) {
          setSelectedNodeId(newId);
        }
      };

      switch (e.key) {
        case 'Tab': {
          // Tab всегда предотвращаем (чтобы не уводил фокус по DOM).
          // Выделение остаётся на текущем узле: повторный Tab даёт ещё одного
          // ребёнка ему же, а не цепочку внуков. Текст тоже идёт в выбранный.
          e.preventDefault();
          if (selectedNodeId) {
            addChildNode(selectedNodeId);
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
          if (selectedGroupId) {
            e.preventDefault();
            setEditingGroupId(selectedGroupId, { mode: 'edit' });
            break;
          }
          if (selectedNodeId) {
            e.preventDefault();
            setEditingNodeId(selectedNodeId, { mode: 'edit' });
          }
          break;
        }

        case 'Delete':
        case 'Backspace': {
          // Выбрана группа — удаляем её (узлы не трогаем).
          const { selectedGroupId, setSelectedGroupId } = useUIStore.getState();
          if (selectedGroupId) {
            e.preventDefault();
            useMindMapStore.getState().deleteGroup(selectedGroupId);
            setSelectedGroupId(null);
            break;
          }
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
            break;
          }
          // Узел не выбран — удаляем выбранные free-связи (deleteEdges сам
          // пропускает структурные рёбра: они удаляются только с узлом).
          const { selectedEdgeIds, setSelection } = useUIStore.getState();
          if (selectedEdgeIds.length > 0) {
            e.preventDefault();
            useMindMapStore.getState().deleteEdges(selectedEdgeIds);
            setSelection([], []);
          }
          break;
        }

        case 'Escape': {
          const ui = useUIStore.getState();
          if (ui.groupDrawMode) {
            e.preventDefault();
            ui.setGroupDrawMode(false);
            return;
          }
          // Снять выделение (узлов и группы)
          setSelectedNodeId(null);
          ui.setSelectedGroupId(null);
          break;
        }

        default: {
          if (selectedGroupId && isPrintableCharacter(e)) {
            e.preventDefault();
            setEditingGroupId(selectedGroupId, { mode: 'replace', initialValue: e.key });
            break;
          }
          if (selectedNodeId && isPrintableCharacter(e)) {
            e.preventDefault();
            setEditingNodeId(selectedNodeId, { mode: 'replace', initialValue: e.key });
          }
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // пустые deps: используем getState(), обработчик стабилен
}
