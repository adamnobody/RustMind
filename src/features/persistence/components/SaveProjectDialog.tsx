import { useCallback, useEffect, useState } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { useT, translate, isUntitledDocument } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/Icon/Icon';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { fileService } from '../fileService';
import { saveDocumentAs } from '../usePersistence';
import {
  directoryFromPath,
  joinProjectPath,
  projectNameFromPath,
  sanitizeProjectName,
} from '../recentFiles';
import styles from './SaveProjectDialog.module.css';

export function SaveProjectDialog(): React.JSX.Element | null {
  const isOpen = useUIStore((s) => s.isSaveProjectOpen);
  const close = useUIStore((s) => s.closeSaveProject);
  const setNewProjectDir = useUIStore((s) => s.setNewProjectDir);
  const t = useT();

  const [name, setName] = useState('');
  const [dir, setDir] = useState('');
  const [remember, setRemember] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const { documentName, filePath } = useMindMapStore.getState();
    const remembered = useUIStore.getState().settings.newProjectDir;
    const fromFile = filePath ? projectNameFromPath(filePath) : '';
    const untitled = isUntitledDocument(documentName);
    setName(fromFile || (untitled ? '' : documentName));
    setDir(filePath ? directoryFromPath(filePath) : remembered);
    setRemember(Boolean(remembered));
    setSaving(false);

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  const safeName = sanitizeProjectName(name);
  const canSave = Boolean(safeName && dir) && !saving;
  const preview = dir && safeName ? joinProjectPath(dir, safeName) : '';

  const pickDir = useCallback(async () => {
    try {
      const picked = await fileService.showDirectoryDialog(dir || undefined);
      if (picked) setDir(picked);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(translate('dialog.error', { message }));
    }
  }, [dir]);

  const submit = useCallback(async () => {
    if (!safeName || !dir || saving) return;
    const dest = joinProjectPath(dir, safeName);
    const current = useMindMapStore.getState().filePath;
    try {
      if (dest !== current && (await fileService.fileExists(dest))) {
        if (!window.confirm(t('saveProject.overwrite', { name: `${safeName}.rustmind` }))) return;
      }
      setSaving(true);
      await saveDocumentAs(dest, safeName);
      setNewProjectDir(remember ? dir : '');
      close();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(translate('dialog.error', { message }));
      setSaving(false);
    }
  }, [safeName, dir, saving, remember, t, setNewProjectDir, close]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onMouseDown={close}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t('saveProject.title')}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>
              <span className={styles.titlePrompt}>&gt;</span>
              <span>{t('saveProject.title')}</span>
            </h2>
            <p className={styles.subtitle}>{t('saveProject.subtitle')}</p>
          </div>
          <IconButton icon="x" label={t('drawer.closeSettings')} onClick={close} />
        </header>

        <div className={styles.body}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              <span className={styles.cardChevron}>&gt;</span>
              {t('saveProject.name')}
            </span>
            <input
              autoFocus
              className={styles.input}
              value={name}
              placeholder={t('saveProject.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          </label>

          <button type="button" className={styles.pathCard} onClick={() => void pickDir()}>
            <span className={styles.fieldLabel}>
              <span className={styles.cardChevron}>&gt;</span>
              {t('saveProject.path')}
            </span>
            <span className={styles.pathRow}>
              <span className={dir ? styles.pathValue : styles.pathPlaceholder}>
                {dir || t('saveProject.pathPlaceholder')}
              </span>
              <Icon name="folder-open" size={16} />
            </span>
            {preview ? <span className={styles.preview}>{preview}</span> : null}
          </button>

          <label className={styles.remember}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>{t('saveProject.remember')}</span>
          </label>
        </div>

        <footer className={styles.footer}>
          <span className={styles.hints}>
            <span>
              <span className={styles.hintKey}>↵</span> {t('saveProject.hintSave')}
            </span>
            <span>
              <span className={styles.hintKey}>esc</span> {t('saveProject.hintClose')}
            </span>
          </span>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={!canSave}
            onClick={() => void submit()}
          >
            {t('saveProject.save')}
          </button>
        </footer>
      </div>
    </div>
  );
}
