import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './MenuBar.module.css';

/** Один пункт выпадающего меню: действие, переключатель или разделитель. */
export type MenuItemDef =
  | { kind: 'action'; label: string; hotkey?: string; disabled?: boolean; onSelect: () => void }
  | { kind: 'checkbox'; label: string; checked: boolean; onSelect: () => void }
  | { kind: 'separator' };

/** Пункт меню-бара: с выпадающим списком (`items`) или прямым действием (`onSelect`). */
export interface MenuDef {
  id: string;
  label: string;
  items?: MenuItemDef[];
  onSelect?: () => void;
}

interface MenuBarProps {
  menus: MenuDef[];
}

/**
 * Классический меню-бар: один открытый список за раз, наведение переключает
 * между меню (пока какое-то открыто), клик вне и Escape закрывают.
 */
export function MenuBar({ menus }: MenuBarProps): React.JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openId === null) return;
    const onPointerDown = (e: PointerEvent): void => {
      if (!barRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpenId(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openId]);

  const handleTrigger = (m: MenuDef): void => {
    if (!m.items && m.onSelect) {
      setOpenId(null);
      m.onSelect();
      return;
    }
    setOpenId((prev) => (prev === m.id ? null : m.id));
  };

  // Наведение переключает меню только когда какое-то уже открыто (стандартное
  // поведение меню-бара). Наведение на кнопку-действие закрывает открытый список.
  const handleEnter = (m: MenuDef): void => {
    if (openId === null) return;
    setOpenId(m.items ? m.id : null);
  };

  const runItem = (item: MenuItemDef): void => {
    setOpenId(null);
    if (item.kind !== 'separator') item.onSelect();
  };

  return (
    <div ref={barRef} className={styles.bar}>
      {menus.map((m) => (
        <div key={m.id} className={styles.group}>
          <button
            type="button"
            className={clsx(styles.trigger, openId === m.id && styles.triggerOpen)}
            onClick={() => handleTrigger(m)}
            onPointerEnter={() => handleEnter(m)}
            aria-haspopup={m.items ? 'menu' : undefined}
            aria-expanded={m.items ? openId === m.id : undefined}
          >
            {m.label}
          </button>

          {m.items && openId === m.id && (
            <div className={styles.dropdown} role="menu">
              {m.items.map((item, i) =>
                item.kind === 'separator' ? (
                  <div key={i} className={styles.sep} role="separator" />
                ) : (
                  <button
                    key={i}
                    type="button"
                    role={item.kind === 'checkbox' ? 'menuitemcheckbox' : 'menuitem'}
                    aria-checked={item.kind === 'checkbox' ? item.checked : undefined}
                    className={styles.item}
                    disabled={item.kind === 'action' && item.disabled}
                    onClick={() => runItem(item)}
                  >
                    <span className={styles.check} aria-hidden="true">
                      {item.kind === 'checkbox' && item.checked ? '✓' : ''}
                    </span>
                    <span className={styles.itemLabel}>{item.label}</span>
                    {item.kind === 'action' && item.hotkey && (
                      <span className={styles.hotkey}>{item.hotkey}</span>
                    )}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
