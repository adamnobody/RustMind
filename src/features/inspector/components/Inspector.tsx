import { useShallow } from 'zustand/react/shallow';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { useT } from '../../../shared/i18n';
import { NodeStyleEditor } from './NodeStyleEditor';
import { EdgeStyleEditor } from './EdgeStyleEditor';
import styles from './Inspector.module.css';

/**
 * Right-docked, non-modal style panel. Unlike the settings Drawer it never dims
 * or blocks the canvas — the user keeps editing/selecting while it's open so node
 * style changes are visible live. Visibility (open / manually-hidden) lives in
 * uiStore session state only and is never written to the document.
 */
export function Inspector(): React.JSX.Element | null {
  const t = useT();
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
  const singleEdgeId =
    selectedEdgeIds.length === 1 && selectedNodeIds.length === 0 ? selectedEdgeIds[0] : null;
  const node = useMindMapStore((s) =>
    singleNodeId ? s.nodes.find((n) => n.id === singleNodeId) : undefined,
  );
  const edge = useMindMapStore((s) =>
    singleEdgeId ? s.edges.find((e) => e.id === singleEdgeId) : undefined,
  );

  if (!inspectorOpen) {
    return null;
  }

  const title = node
    ? t('inspector.nodeStyle')
    : edge
      ? t('inspector.edgeStyle')
      : t('inspector.properties');

  return (
    // Keep keystrokes typed into the panel away from the canvas' global node
    // hotkeys (Delete/Tab/printable) which listen on window.
    <aside
      className={styles.panel}
      aria-label={t('inspector.properties')}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <IconButton icon="x" label={t('inspector.hidePanel')} onClick={hideInspector} />
      </header>
      <div className={styles.body}>
        {node ? (
          <NodeStyleEditor nodeId={node.id} data={node.data} />
        ) : edge ? (
          <EdgeStyleEditor edgeId={edge.id} data={edge.data} />
        ) : (
          <p className={styles.empty}>{t('inspector.empty')}</p>
        )}
      </div>
    </aside>
  );
}
