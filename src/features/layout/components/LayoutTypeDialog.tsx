import { useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { useT } from '../../../shared/i18n';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { LAYOUT_KINDS, type LayoutKind } from '../engines/layoutTypes';
import { LAYOUT_LABEL_KEYS, LAYOUT_DESC_KEYS } from '../lib/layoutLabels';
import { LAYOUT_PREVIEWS } from './layoutPreviews';
import styles from './LayoutTypeDialog.module.css';

/**
 * Диалог выбора типа карты: открывается сразу для нового документа и по
 * кнопке «Изменить тип карты» в тулбаре. Читает/пишет состояние сам (как
 * SettingsPanel) — вызывающему коду достаточно вызвать openLayoutPicker().
 */
export function LayoutTypeDialog(): React.JSX.Element | null {
  const isOpen = useUIStore((s) => s.isLayoutPickerOpen);
  const closeLayoutPicker = useUIStore((s) => s.closeLayoutPicker);
  const triggerFitView = useUIStore((s) => s.triggerFitView);
  const layoutType = useMindMapStore((s) => s.layoutType);
  const setLayoutType = useMindMapStore((s) => s.setLayoutType);
  const t = useT();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeLayoutPicker();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeLayoutPicker]);

  const handlePick = useCallback(
    (kind: LayoutKind) => {
      if (kind !== layoutType) {
        setLayoutType(kind);
        setTimeout(triggerFitView, 50);
      }
      closeLayoutPicker();
    },
    [layoutType, setLayoutType, triggerFitView, closeLayoutPicker],
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onMouseDown={closeLayoutPicker}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t('layoutPicker.title')}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>{t('layoutPicker.title')}</h2>
            <p className={styles.subtitle}>{t('layoutPicker.subtitle')}</p>
          </div>
          <IconButton icon="x" label={t('drawer.closeSettings')} onClick={closeLayoutPicker} />
        </header>

        <div className={styles.grid}>
          {LAYOUT_KINDS.map((kind) => {
            const active = kind === layoutType;
            return (
              <button
                key={kind}
                type="button"
                className={clsx(styles.card, active && styles.cardActive)}
                onClick={() => handlePick(kind)}
              >
                {active && <span className={styles.badge}>{t('layoutPicker.current')}</span>}
                <div className={styles.preview}>{LAYOUT_PREVIEWS[kind]}</div>
                <div className={styles.cardLabel}>{t(LAYOUT_LABEL_KEYS[kind])}</div>
                <div className={styles.cardDesc}>{t(LAYOUT_DESC_KEYS[kind])}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
