import { useShallow } from 'zustand/react/shallow';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { Icon } from '../../../shared/ui/Icon/Icon';
import { useT } from '../../../shared/i18n';
import { DEFAULT_NODE_STYLE, DEFAULT_HANDLE_OFFSET, type HandleSide } from '../../nodes/types';
import { DEFAULT_EDGE_STYLE } from '../../edges/types';
import { NodeStyleEditor } from './NodeStyleEditor';
import { EdgeStyleEditor } from './EdgeStyleEditor';
import { GroupEditor } from './GroupEditor';
import styles from './Inspector.module.css';

const HANDLE_SIDES: HandleSide[] = ['top', 'right', 'bottom', 'left'];

/**
 * Right-docked, non-modal style panel. Unlike the settings Drawer it never dims
 * or blocks the canvas — the user keeps editing/selecting while it's open so node
 * style changes are visible live. Visibility (open / manually-hidden) lives in
 * uiStore session state only and is never written to the document.
 *
 * Оформление — перенос дизайн-прототипа «Node Style Panel» из handoff-бандла:
 * шапка с маркером и курсором, секции с капслок-заголовками, подвал со сбросом.
 */
export function Inspector(): React.JSX.Element | null {
  const t = useT();
  const { inspectorOpen, selectedNodeIds, selectedEdgeIds, selectedGroupId, hideInspector } =
    useUIStore(
      useShallow((s) => ({
        inspectorOpen: s.inspectorOpen,
        selectedNodeIds: s.selectedNodeIds,
        selectedEdgeIds: s.selectedEdgeIds,
        selectedGroupId: s.selectedGroupId,
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
  const group = useMindMapStore((s) =>
    selectedGroupId ? s.groups.find((g) => g.id === selectedGroupId) : undefined,
  );

  if (!inspectorOpen) {
    return null;
  }

  const title = node
    ? t('inspector.nodeStyle')
    : edge
      ? t('inspector.edgeStyle')
      : group
        ? t('inspector.groupStyle')
        : t('inspector.properties');

  const meta = node
    ? t('inspector.metaNode', { id: node.id })
    : edge
      ? t('inspector.metaEdge', { id: edge.id })
      : group
        ? t('inspector.metaGroup', { id: group.id })
        : t('inspector.metaNone');

  // «Сбросить» возвращает стиль выбранного элемента к дефолтам. Пишем именно
  // дефолтные значения: setNodeStyle/setEdgeStyle прунят их (поле = дефолт →
  // поле удаляется), так что документ не распухает явными значениями.
  const canReset = node
    ? Object.keys(node.data.style ?? {}).length > 0 || node.data.handleOffsets !== undefined
    : edge
      ? Object.keys(edge.data?.style ?? {}).some((k) => k !== 'label')
      : group
        ? group.color !== undefined ||
          Object.values(group.titleStyle ?? {}).some((v) => v !== undefined)
        : false;

  const resetAll = (): void => {
    const store = useMindMapStore.getState();
    if (node) {
      store.setNodeStyle(node.id, { ...DEFAULT_NODE_STYLE });
      for (const side of HANDLE_SIDES) {
        store.setNodeHandleOffset(node.id, side, DEFAULT_HANDLE_OFFSET);
      }
    } else if (edge) {
      // Подпись — контент, а не оформление: сброс стиля её не стирает.
      store.setEdgeStyle(edge.id, { ...DEFAULT_EDGE_STYLE });
    } else if (group) {
      store.updateGroup(group.id, {
        color: undefined,
        titleStyle: {
          fontFamily: undefined,
          fontSize: undefined,
          color: undefined,
          bold: undefined,
          italic: undefined,
          underline: undefined,
        },
      });
    }
  };

  return (
    // Keep keystrokes typed into the panel away from the canvas' global node
    // hotkeys (Delete/Tab/printable) which listen on window.
    <aside
      className={styles.panel}
      aria-label={t('inspector.properties')}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span className={styles.scan} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>
            <span className={styles.titleMark} aria-hidden="true">
              ◑
            </span>
            {title}
            <span className={styles.caret} aria-hidden="true">
              _
            </span>
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            aria-label={t('inspector.hidePanel')}
            title={t('inspector.hidePanel')}
            onClick={hideInspector}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
        <p className={styles.meta}>// {meta}</p>
      </header>

      <div className={styles.body}>
        {node ? (
          <NodeStyleEditor nodeId={node.id} data={node.data} />
        ) : edge ? (
          <EdgeStyleEditor edgeId={edge.id} data={edge.data} />
        ) : group ? (
          <GroupEditor groupId={group.id} />
        ) : (
          <p className={styles.empty}>{t('inspector.empty')}</p>
        )}
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.footerReset}
          disabled={!canReset}
          onClick={resetAll}
        >
          <Icon name="undo" size={13} />
          {t('inspector.resetAll')}
        </button>
        <span className={styles.footerHint}>{t('inspector.appliesInstantly')}</span>
      </footer>
    </aside>
  );
}
