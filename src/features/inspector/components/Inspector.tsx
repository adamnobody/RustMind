import { useShallow } from 'zustand/react/shallow';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { NodeStyleEditor } from './NodeStyleEditor';
import styles from './Inspector.module.css';

/**
 * Right-docked, non-modal style panel. Unlike the settings Drawer it never dims
 * or blocks the canvas — the user keeps editing/selecting while it's open so node
 * style changes are visible live. Visibility (open / manually-hidden) lives in
 * uiStore session state only and is never written to the document.
 */
export function Inspector(): React.JSX.Element | null {
  const { inspectorOpen, selectedNodeIds, selectedEdgeIds, hideInspector } = useUIStore(
    useShallow((s) => ({
      inspectorOpen: s.inspectorOpen,
      selectedNodeIds: s.selectedNodeIds,
      selectedEdgeIds: s.selectedEdgeIds,
      hideInspector: s.hideInspector,
    })),
  );

  const singleNodeId =
    selectedNodeIds.length === 1 && selectedEdgeIds.length === 0 ? selectedNodeIds[0] : null;
  const node = useMindMapStore((s) =>
    singleNodeId ? s.nodes.find((n) => n.id === singleNodeId) : undefined,
  );

  if (!inspectorOpen) {
    return null;
  }

  return (
    // Keep keystrokes typed into the panel away from the canvas' global node
    // hotkeys (Delete/Tab/printable) which listen on window.
    <aside
      className={styles.panel}
      aria-label="Свойства"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{node ? 'Стиль узла' : 'Свойства'}</h2>
        <IconButton icon="x" label="Скрыть панель" onClick={hideInspector} />
      </header>
      <div className={styles.body}>
        {node ? (
          <NodeStyleEditor nodeId={node.id} data={node.data} />
        ) : (
          <p className={styles.empty}>Выберите один узел, чтобы изменить его стиль.</p>
        )}
      </div>
    </aside>
  );
}
