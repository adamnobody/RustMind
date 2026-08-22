import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUIStore } from '../../store/uiStore';
import { useT } from '../../shared/i18n';
import { INSPECTOR_PALETTE } from '../inspector/components/fields';
import menuStyles from '../nodes/components/NodeContextMenu.module.css';
import styles from './GroupContextMenu.module.css';

/**
 * ПКМ по пустой области группы (или чипу заголовка): цвет и удаление.
 * Меню ноды не трогает — у узла свой handler со stopPropagation.
 */
export function GroupContextMenu(): React.JSX.Element | null {
  const t = useT();
  const menu = useUIStore((s) => s.contextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);
  const groupMenu = menu?.kind === 'group' ? menu : null;
  const menuRef = useRef<HTMLDivElement>(null);

  const groupId = groupMenu?.groupId ?? null;
  const group = useMindMapStore((s) =>
    groupId ? s.groups.find((g) => g.id === groupId) : undefined,
  );
  const updateGroup = useMindMapStore((s) => s.updateGroup);
  const deleteGroup = useMindMapStore((s) => s.deleteGroup);

  useEffect(() => {
    if (!groupMenu) return;
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
  }, [groupMenu, closeContextMenu]);

  if (!groupMenu || !group) return null;

  const menuX = Math.min(groupMenu.x, window.innerWidth - 260);
  const menuY = Math.min(groupMenu.y, window.innerHeight - 220);

  const setColor = (hex: string | undefined): void => {
    updateGroup(group.id, { color: hex });
  };

  const remove = (): void => {
    deleteGroup(group.id);
    useUIStore.getState().setSelectedGroupId(null);
    closeContextMenu();
  };

  return (
    <div ref={menuRef} className={menuStyles.menu} style={{ left: menuX, top: menuY }} role="menu">
      <div className={styles.block}>
        <span className={styles.caption}>{t('group.fillColor')}</span>
        <div className={styles.swatches} role="group" aria-label={t('group.fillColor')}>
          <button
            type="button"
            className={clsx(styles.swatch, styles.swatchAuto, !group.color && styles.swatchOn)}
            aria-label={t('field.auto')}
            aria-pressed={!group.color}
            onClick={() => setColor(undefined)}
          />
          {INSPECTOR_PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              className={clsx(styles.swatch, group.color === hex && styles.swatchOn)}
              style={{ background: hex }}
              aria-label={hex}
              aria-pressed={group.color === hex}
              onClick={() => setColor(hex)}
            />
          ))}
        </div>
      </div>

      <div className={menuStyles.sep} role="separator" />

      <button type="button" className={clsx(menuStyles.item, menuStyles.danger)} onClick={remove}>
        <span className={menuStyles.itemLabel}>{t('ctxMenu.deleteGroup')}</span>
      </button>
    </div>
  );
}
