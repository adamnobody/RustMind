import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUIStore } from '../../store/uiStore';
import {
  fileService,
  openDocumentFromPath,
  getRecentFiles,
  removeRecentFile,
  type RecentFile,
} from '../../features/persistence';
import { useT, LOCALES, localeTag, type Locale } from '../../shared/i18n';
import { isEditableTarget } from '../../shared/lib/dom';
import { AsciiBackdrop } from './AsciiBackdrop';
import { HomeAppearanceDialog } from './HomeAppearanceDialog';
import styles from './HomeScreen.module.css';

interface HomeScreenProps {
  /** Вызывается, когда документ готов (новый или открытый) — переключает на редактор. */
  onEnterEditor: () => void;
}

/** Базовый цвет символов ASCII-фона в покое, по теме (акцент берётся из настроек). */
const ASCII_BASE: Record<'dark' | 'light', string> = {
  dark: '#606670',
  light: '#1a1a1a',
};

/** Декоративные ASCII-коннекторы для карточек — детерминированно по пути. */
const RECENT_ART = ['o─┬─o─*', 'o─O─┬─o', '┌─o──O─┐', 'O─o─┬─o', '*─┬─o─O', 'o──┼──O'];
function artFor(path: string): string {
  let h = 0;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) | 0;
  return RECENT_ART[Math.abs(h) % RECENT_ART.length];
}

export function HomeScreen({ onEnterEditor }: HomeScreenProps): React.JSX.Element {
  const t = useT();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const settings = useUIStore((s) => s.settings);
  const setHomeAccent = useUIStore((s) => s.setHomeAccent);
  const setHomeFont = useUIStore((s) => s.setHomeFont);

  // Снимок на маунт: список меняется только действиями на этом же экране.
  const [recent, setRecent] = useState<RecentFile[]>(() => getRecentFiles());
  const [langOpen, setLangOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [glitching, setGlitching] = useState(false);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag(locale), {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  const handleCreate = useCallback(() => {
    useMindMapStore.getState().resetDocument();
    useUIStore.getState().openLayoutPicker();
    onEnterEditor();
  }, [onEnterEditor]);

  const handleOpenDialog = useCallback(async () => {
    try {
      const path = await fileService.showOpenDialog();
      if (!path) return;
      await openDocumentFromPath(path);
      onEnterEditor();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(t('dialog.error', { message }));
    }
  }, [onEnterEditor, t]);

  const handleOpenRecent = useCallback(
    async (file: RecentFile) => {
      try {
        await openDocumentFromPath(file.path);
        onEnterEditor();
      } catch {
        window.alert(t('home.openFailed', { name: file.name }));
        removeRecentFile(file.path);
        setRecent(getRecentFiles());
      }
    },
    [onEnterEditor, t],
  );

  const selectLang = useCallback(
    (code: Locale) => {
      setLocale(code);
      setLangOpen(false);
    },
    [setLocale],
  );

  // Периодический глитч вертикального «RUSTMIND» — редко (5–14 с), коротко.
  useEffect(() => {
    let onTimer: ReturnType<typeof setTimeout>;
    let offTimer: ReturnType<typeof setTimeout>;
    const schedule = (): void => {
      onTimer = setTimeout(
        () => {
          setGlitching(true);
          offTimer = setTimeout(() => {
            setGlitching(false);
            schedule();
          }, 380);
        },
        5000 + Math.random() * 9000,
      );
    };
    schedule();
    return () => {
      clearTimeout(onTimer);
      clearTimeout(offTimer);
    };
  }, []);

  // Клавиатура: ⏎ — начать, o — открыть, t — тема, l — язык, Esc — закрыть меню.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isEditableTarget(e.target)) return;
      if (e.key === 'Escape') {
        setLangOpen(false);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.code) {
        case 'Enter':
        case 'NumpadEnter':
          e.preventDefault();
          handleCreate();
          break;
        case 'KeyO':
          e.preventDefault();
          void handleOpenDialog();
          break;
        case 'KeyT':
          e.preventDefault();
          toggleTheme();
          break;
        case 'KeyA':
          if (!appearanceOpen) {
            e.preventDefault();
            setAppearanceOpen(true);
          }
          break;
        case 'KeyL':
          e.preventDefault();
          setLangOpen((v) => !v);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCreate, handleOpenDialog, toggleTheme, appearanceOpen]);

  const ascii = {
    accent: theme === 'light' ? '#141414' : settings.homeAccent,
    base: ASCII_BASE[theme],
  };

  return (
    <div className={styles.screen} data-theme={theme}>
      <AsciiBackdrop accent={ascii.accent} base={ascii.base} />

      {/* Ловец кликов вне меню языка */}
      <div
        className={clsx(styles.scrim, langOpen && styles.scrimActive)}
        onClick={() => setLangOpen(false)}
      />

      {/* Сайдбар */}
      <div className={styles.sidebar}>
        <div className={styles.diamond} aria-hidden="true">
          ◆
        </div>
        <div className={clsx(styles.logo, glitching && styles.logoGlitch)} aria-hidden="true">
          {'RUSTMIND'.split('').map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
        <div className={styles.sideButtons}>
          <button
            type="button"
            className={styles.iconBtn}
            title={t('home.themeTooltip')}
            aria-label={t('home.themeTooltip')}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button
            type="button"
            className={clsx(styles.iconBtn, appearanceOpen && styles.iconBtnActive)}
            title={t('home.appearanceTooltip')}
            aria-label={t('home.appearanceTooltip')}
            onClick={() => setAppearanceOpen(true)}
          >
            ◑
          </button>
          <button
            type="button"
            className={clsx(styles.iconBtn, styles.langBtn, langOpen && styles.iconBtnActive)}
            title={t('home.langTooltip')}
            aria-label={t('home.langTooltip')}
            aria-expanded={langOpen}
            onClick={() => setLangOpen((v) => !v)}
          >
            {locale.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Флайаут выбора языка */}
      <div
        className={clsx(styles.langMenu, langOpen && styles.langMenuOpen)}
        role="menu"
        aria-label={t('home.langMenuTitle')}
      >
        <div className={styles.langTitle}>{t('home.langMenuTitle')}</div>
        {LOCALES.map((l) => {
          const active = l.code === locale;
          return (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              className={clsx(styles.langRow, active && styles.langRowActive)}
              onClick={() => selectLang(l.code)}
            >
              <span className={styles.langTick}>{active ? '›' : ''}</span>
              <span className={styles.langLabel}>{l.native}</span>
              <span className={styles.langUp}>{l.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      {/* Контент */}
      <div className={styles.content}>
        <div className={styles.spacerTop} />

        <button type="button" className={styles.cta} onClick={handleCreate}>
          <div className={styles.ctaLine}>
            <span className={styles.prompt}>&gt;</span> {t('home.newProject')}
            <span className={styles.cursor}>_</span>
          </div>
        </button>
        {/* Подсказка дублирует клавиши/сайдбар — для мыши кликабельна, но вне
            tab-порядка и скрыта от скринридеров (иначе — фокус внутри aria-hidden). */}
        <div className={styles.hint} aria-hidden="true">
          <button type="button" tabIndex={-1} className={styles.hintItem} onClick={handleCreate}>
            <span className={styles.hintKey}>⏎</span> {t('home.hintStart')}
          </button>
          <span className={styles.hintSep}>·</span>
          <button
            type="button"
            tabIndex={-1}
            className={styles.hintItem}
            onClick={() => void handleOpenDialog()}
          >
            <span className={styles.hintKey}>o</span> {t('home.hintOpen')}
          </button>
          <span className={styles.hintSep}>·</span>
          <button type="button" tabIndex={-1} className={styles.hintItem} onClick={toggleTheme}>
            <span className={styles.hintKey}>t</span> {t('home.hintTheme')}
          </button>
          <span className={styles.hintSep}>·</span>
          <button
            type="button"
            tabIndex={-1}
            className={styles.hintItem}
            onClick={() => setAppearanceOpen(true)}
          >
            <span className={styles.hintKey}>a</span> {t('home.hintAppearance')}
          </button>
          <span className={styles.hintSep}>·</span>
          <button
            type="button"
            tabIndex={-1}
            className={styles.hintItem}
            onClick={() => setLangOpen((v) => !v)}
          >
            <span className={styles.hintKey}>l</span> {t('home.hintLang')}
          </button>
        </div>

        <div className={styles.spacerMid} />

        <div className={styles.recentLabel}>{t('home.recent')}</div>
        {recent.length === 0 ? (
          <div className={styles.recentEmpty}>{t('home.recentEmpty')}</div>
        ) : (
          <div className={styles.recentRow}>
            {recent.slice(0, 4).map((file) => (
              <button
                key={file.path}
                type="button"
                className={styles.card}
                title={file.path}
                onClick={() => void handleOpenRecent(file)}
              >
                <div className={styles.cardName}>{file.name}</div>
                <div className={styles.cardMeta}>{dateFmt.format(new Date(file.openedAt))}</div>
                <div className={styles.cardArt} aria-hidden="true">
                  {artFor(file.path)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <HomeAppearanceDialog
        isOpen={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        accentHex={settings.homeAccent}
        fontName={settings.homeFont}
        onAccentChange={setHomeAccent}
        onFontChange={setHomeFont}
      />
    </div>
  );
}
