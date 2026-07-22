import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { useT } from '../../../shared/i18n';
import { BUILTIN_STATUSES, type HandleSide, type StatusOption } from '../types';
import { oppositeHandle } from '../../edges/types';
import { treeChildrenMap } from '../../layout/strategies/shared';
import { NODE_COLORS } from '../../../shared/lib/constants';
import styles from './NodeContextMenu.module.css';

const CHILD_DIRECTIONS: { side: HandleSide; labelKey: 'ctxMenu.addChildRight' | 'ctxMenu.addChildLeft' | 'ctxMenu.addChildTop' | 'ctxMenu.addChildBottom' }[] = [
  { side: 'right', labelKey: 'ctxMenu.addChildRight' },
  { side: 'left', labelKey: 'ctxMenu.addChildLeft' },
  { side: 'top', labelKey: 'ctxMenu.addChildTop' },
  { side: 'bottom', labelKey: 'ctxMenu.addChildBottom' },
];

/**
 * Смещение позиции нового узла от родителя по выбранной стороне — совпадает с
 * дефолтным сдвигом addChildNode (+200 вправо). Для derived-раскладок это лишь
 * плейсхолдер (recomputeIfDerived тут же перепишет), но для 'stored'
 * (network/free) — финальная точка: без него узел всегда падал бы в дефолтную
 * "вправо", а ребро (fixed-роутинг) тянулось бы от выбранного хэндла в другую
 * сторону — залом линии, как на баг-репорте.
 */
const CHILD_OFFSET = 200;
function positionForSide(parentX: number, parentY: number, side: HandleSide): { x: number; y: number } {
  switch (side) {
    case 'right':
      return { x: parentX + CHILD_OFFSET, y: parentY };
    case 'left':
      return { x: parentX - CHILD_OFFSET, y: parentY };
    case 'top':
      return { x: parentX, y: parentY - CHILD_OFFSET };
    case 'bottom':
      return { x: parentX, y: parentY + CHILD_OFFSET };
  }
}

/**
 * Правый клик по узлу: создать дочерний узел в конкретном направлении,
 * сменить статус (встроенный/пользовательский/новый), удалить узел, скрыть
 * дочерние ветки. Один плоский уровень + один flyout-подменю за раз (as в
 * MenuBar), но позиционируется в точке курсора (position: fixed), а не в
 * панели меню-бара.
 */
export function NodeContextMenu(): React.JSX.Element | null {
  const t = useT();
  const menu = useUIStore((s) => s.contextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const [openSub, setOpenSub] = useState<'child' | 'status' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const nodeId = menu?.nodeId ?? null;
  const { isRoot, parentX, parentY, directChildIds, customStatuses } = useMindMapStore(
    useShallow((s) => {
      const node = nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined;
      const children = nodeId ? (treeChildrenMap(s.nodes, s.edges).get(nodeId) ?? []) : [];
      return {
        isRoot: Boolean(node?.data.isRoot),
        parentX: node?.position.x ?? 0,
        parentY: node?.position.y ?? 0,
        directChildIds: children,
        customStatuses: s.projectSettings.customStatuses,
      };
    }),
  );
  const addChildNode = useMindMapStore((s) => s.addChildNode);
  const updateNodeData = useMindMapStore((s) => s.updateNodeData);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const toggleBranchCollapse = useMindMapStore((s) => s.toggleBranchCollapse);
  const setProjectSettings = useMindMapStore((s) => s.setProjectSettings);

  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: PointerEvent): void => {
      if (!menuRef.current?.contains(e.target as Node)) closeContextMenu();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeContextMenu();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu, closeContextMenu]);

  if (!menu) return null;
  const { nodeId: id } = menu;
  // ponytail: не учитывает высоту раскрытого подменю справа — приемлемо для
  // экранов десктоп-приложения, доработать флипом стороны, если понадобится.
  const menuX = Math.min(menu.x, window.innerWidth - 240);
  const menuY = Math.min(menu.y, window.innerHeight - 200);

  const addChild = (side: HandleSide): void => {
    const newId = addChildNode(id, positionForSide(parentX, parentY, side), {
      sourceHandle: side,
      targetHandle: oppositeHandle(side),
    });
    if (newId) setSelectedNodeId(newId);
    closeContextMenu();
  };

  const setStatus = (statusId: string | undefined): void => {
    updateNodeData(id, { status: statusId });
    closeContextMenu();
  };

  const addCustomStatus = (): void => {
    const label = window.prompt(t('status.customPrompt'))?.trim();
    if (!label) return;
    const palette = NODE_COLORS.palette;
    const color = palette[(customStatuses?.length ?? 0) % palette.length];
    const status: StatusOption = { id: `custom-${Date.now()}`, label, color };
    setProjectSettings({ customStatuses: [...(customStatuses ?? []), status] });
    setStatus(status.id);
  };

  const hideChildren = (): void => {
    if (directChildIds.length === 0) return;
    toggleBranchCollapse(id, directChildIds);
    closeContextMenu();
  };

  const remove = (): void => {
    deleteNode(id);
    setSelectedNodeId(null);
    closeContextMenu();
  };

  return (
    <div ref={menuRef} className={styles.menu} style={{ left: menuX, top: menuY }} role="menu">
      <div className={styles.itemRow}>
        <button
          type="button"
          className={styles.item}
          onPointerEnter={() => setOpenSub('child')}
          onClick={() => setOpenSub((s) => (s === 'child' ? null : 'child'))}
        >
          <span className={styles.itemLabel}>{t('ctxMenu.addChild')}</span>
          <span className={styles.chevron}>›</span>
        </button>
        {openSub === 'child' && (
          <div className={styles.submenu} role="menu">
            {CHILD_DIRECTIONS.map(({ side, labelKey }) => (
              <button key={side} type="button" className={styles.item} onClick={() => addChild(side)}>
                <span className={styles.itemLabel}>{t(labelKey)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.itemRow}>
        <button
          type="button"
          className={styles.item}
          onPointerEnter={() => setOpenSub('status')}
          onClick={() => setOpenSub((s) => (s === 'status' ? null : 'status'))}
        >
          <span className={styles.itemLabel}>{t('ctxMenu.changeStatus')}</span>
          <span className={styles.chevron}>›</span>
        </button>
        {openSub === 'status' && (
          <div className={styles.submenu} role="menu">
            {BUILTIN_STATUSES.map((s) => (
              <button key={s.id} type="button" className={styles.item} onClick={() => setStatus(s.id)}>
                <span className={styles.swatch} style={{ backgroundColor: s.color }} aria-hidden="true" />
                <span className={styles.itemLabel}>{s.labelKey ? t(s.labelKey) : s.label}</span>
              </button>
            ))}
            {customStatuses?.map((s) => (
              <button key={s.id} type="button" className={styles.item} onClick={() => setStatus(s.id)}>
                <span className={styles.swatch} style={{ backgroundColor: s.color }} aria-hidden="true" />
                <span className={styles.itemLabel}>{s.label}</span>
              </button>
            ))}
            <div className={styles.sep} role="separator" />
            <button type="button" className={styles.item} onClick={addCustomStatus}>
              <span className={styles.itemLabel}>{t('status.addCustom')}</span>
            </button>
          </div>
        )}
      </div>

      <div className={styles.sep} role="separator" />

      <button type="button" className={clsx(styles.item, styles.danger)} disabled={isRoot} onClick={remove}>
        <span className={styles.itemLabel}>{t('ctxMenu.delete')}</span>
      </button>
      <button
        type="button"
        className={styles.item}
        disabled={directChildIds.length === 0}
        onClick={hideChildren}
      >
        <span className={styles.itemLabel}>{t('ctxMenu.hideChildren')}</span>
      </button>
    </div>
  );
}
