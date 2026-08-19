import { useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { useUIStore } from '../../../store/uiStore';
import { useT, translate } from '../../../shared/i18n';
import { Icon, type IconName } from '../../../shared/ui/Icon/Icon';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { exportMindMap, EXPORT_FORMATS, type ExportFormat } from '../exportImage';
import type { TranslationKey } from '../../../shared/i18n/translations';
import styles from '../../layout/components/LayoutTypeDialog.module.css';

const FORMAT_META: Record<
  ExportFormat,
  { icon: IconName; label: TranslationKey; desc: TranslationKey }
> = {
  png: { icon: 'image', label: 'exportPicker.png', desc: 'exportPicker.desc.png' },
  svg: { icon: 'layoutRadial', label: 'exportPicker.svg', desc: 'exportPicker.desc.svg' },
  pdf: { icon: 'file', label: 'exportPicker.pdf', desc: 'exportPicker.desc.pdf' },
  json: { icon: 'template', label: 'exportPicker.json', desc: 'exportPicker.desc.json' },
  markdown: { icon: 'note', label: 'exportPicker.markdown', desc: 'exportPicker.desc.markdown' },
};

export function ExportDialog(): React.JSX.Element | null {
  const isOpen = useUIStore((s) => s.isExportPickerOpen);
  const close = useUIStore((s) => s.closeExportPicker);
  const t = useT();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  const handlePick = useCallback(
    (format: ExportFormat) => {
      close();
      // Снимок холста — после закрытия оверлея, иначе html-to-image ждёт кадр с диалогом.
      window.setTimeout(() => {
        void (async () => {
          try {
            await exportMindMap(format);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            window.alert(translate('dialog.error', { message }));
          }
        })();
      }, 50);
    },
    [close],
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onMouseDown={close}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t('exportPicker.title')}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>
              <span className={styles.titlePrompt}>&gt;</span>
              <span>{t('exportPicker.title')}</span>
            </h2>
            <p className={styles.subtitle}>{t('exportPicker.subtitle')}</p>
          </div>
          <IconButton icon="x" label={t('drawer.closeSettings')} onClick={close} />
        </header>

        <div className={styles.grid}>
          {EXPORT_FORMATS.map((format) => {
            const meta = FORMAT_META[format];
            return (
              <button
                key={format}
                type="button"
                className={clsx(styles.card)}
                onClick={() => handlePick(format)}
              >
                <div className={styles.preview}>
                  <Icon name={meta.icon} size={36} />
                </div>
                <div className={styles.cardLabelRow}>
                  <span className={styles.cardChevron}>&gt;</span>
                  <span className={styles.cardLabel}>{t(meta.label)}</span>
                </div>
                <div className={styles.cardDesc}>{t(meta.desc)}</div>
              </button>
            );
          })}
        </div>

        <footer className={styles.footer}>
          <span>
            <span className={styles.hintKey}>esc</span> {t('exportPicker.hintClose')}
          </span>
        </footer>
      </div>
    </div>
  );
}
