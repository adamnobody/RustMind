import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useT, type TranslationKey } from '../../shared/i18n';
import styles from './HomeAppearanceDialog.module.css';

const ACCENTS: { hex: string; nameKey: TranslationKey }[] = [
  { hex: '#5fd4ff', nameKey: 'home.accent.blue' },
  { hex: '#ff8c50', nameKey: 'home.accent.orange' },
  { hex: '#35ff87', nameKey: 'home.accent.crt' },
  { hex: '#b28cff', nameKey: 'home.accent.violet' },
  { hex: '#e0576f', nameKey: 'home.accent.burgundy' },
];

const FONTS: { name: string; tagKey: TranslationKey }[] = [
  { name: 'IBM Plex Mono', tagKey: 'home.font.system' },
  { name: 'JetBrains Mono', tagKey: 'home.font.code' },
  { name: 'Ubuntu Mono', tagKey: 'home.font.terminal' },
  { name: 'PT Mono', tagKey: 'home.font.teletype' },
  { name: 'Fira Code', tagKey: 'home.font.ligatures' },
];

const FONT_SAMPLE = 'RUSTMIND · Бб Яя 0123 {}=>';

/** Длительность .panelClosing (crtOff) в HomeAppearanceDialog.module.css. */
const CLOSE_MS = 400;

interface HomeAppearanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accentHex: string;
  fontName: string;
  onAccentChange: (hex: string) => void;
  onFontChange: (name: string) => void;
}

/**
 * Диалог «Внешний вид» главного меню (порт RustMind 4e): CRT-анимация
 * открытия/закрытия, акцентный цвет и шрифт. В отличие от исходного дизайна
 * не содержит секции опроса «что ещё добавить» — по требованию продукта.
 */
export function HomeAppearanceDialog({
  isOpen,
  onClose,
  accentHex,
  fontName,
  onAccentChange,
  onFontChange,
}: HomeAppearanceDialogProps): React.JSX.Element | null {
  const t = useT();
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');

  useEffect(() => {
    if (isOpen) {
      setPhase('open');
      return undefined;
    }
    setPhase((p) => (p === 'open' ? 'closing' : p));
  }, [isOpen]);

  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const timer = setTimeout(() => setPhase('closed'), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'open') return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onClose]);

  if (phase === 'closed') return null;

  const activeAccent = ACCENTS.find((c) => c.hex === accentHex) ?? ACCENTS[0];

  return (
    <div
      className={clsx(styles.wrap, phase === 'open' && styles.wrapOpen)}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={clsx(styles.panel, phase === 'closing' && styles.panelClosing)}
        role="dialog"
        aria-modal="true"
        aria-label={t('home.appearanceTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.scan} aria-hidden="true" />
        <div className={styles.sweep} aria-hidden="true" />

        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.headerGlyph}>◑</span> {t('home.appearanceTitle')}
            <span className={styles.cursor}>_</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            [ESC]
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.sectionAccent}>
            <div className={styles.label}>{t('home.accentLabel')}</div>
            <div className={styles.swatchRow}>
              {ACCENTS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={t(c.nameKey)}
                  aria-label={t(c.nameKey)}
                  className={clsx(styles.swatch, c.hex === accentHex && styles.swatchActive)}
                  style={{ background: c.hex, color: c.hex }}
                  onClick={() => onAccentChange(c.hex)}
                />
              ))}
            </div>
            <div className={styles.accentName}>{t(activeAccent.nameKey)}</div>
          </section>

          <section className={styles.sectionFont}>
            <div className={styles.label}>{t('home.fontLabel')}</div>
            <div className={styles.fontList}>
              {FONTS.map((f) => {
                const active = f.name === fontName;
                const sampleStyle = { fontFamily: `"${f.name}", monospace` };
                return (
                  <button
                    key={f.name}
                    type="button"
                    className={clsx(styles.fontRow, active && styles.fontRowActive)}
                    onClick={() => onFontChange(f.name)}
                  >
                    <span className={styles.fontInfo}>
                      <span className={styles.fontName} style={sampleStyle}>
                        {f.name}
                      </span>
                      <span className={styles.fontSample} style={sampleStyle}>
                        {FONT_SAMPLE}
                      </span>
                    </span>
                    <span className={styles.fontTag}>{t(f.tagKey)}</span>
                    <span className={styles.fontTick}>{active ? '›' : ''}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
