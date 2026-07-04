import { useCallback } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import { useT } from '../../../shared/i18n';
import type { HandleVisibility } from '../../../store/types';
import styles from './AppToolbar.module.css';

interface AppToolbarProps {
  onNew?: () => void;
  onOpen?: () => Promise<void>;
  onSave?: () => Promise<void>;
  onSaveAs?: () => Promise<void>;
  onHome?: () => void;
}

export function AppToolbar({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onHome,
}: AppToolbarProps): React.JSX.Element {
  const documentName = useMindMapStore((s) => s.documentName);
  const isDirty = useMindMapStore((s) => s.isDirty);
  const applyAutoLayoutManual = useMindMapStore((s) => s.applyAutoLayoutManual);
  const undo = useMindMapStore((s) => s.undo);
  const redo = useMindMapStore((s) => s.redo);
  const canUndo = useMindMapStore((s) => s.canUndo);
  const canRedo = useMindMapStore((s) => s.canRedo);
  const projectSettings = useMindMapStore((s) => s.projectSettings);
  const setProjectSettings = useMindMapStore((s) => s.setProjectSettings);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const openSettings = useUIStore((s) => s.openSettings);
  const triggerFitView = useUIStore((s) => s.triggerFitView);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const toggleInspector = useUIStore((s) => s.toggleInspector);
  const t = useT();

  const handleAutoLayout = useCallback(() => {
    applyAutoLayoutManual();
    setTimeout(triggerFitView, 50);
  }, [applyAutoLayoutManual, triggerFitView]);

  return (
    <header className={styles.toolbar}>
      <div className={styles.brand}>
        <div className={styles.logo} aria-hidden="true">
          R
        </div>
        <div className={styles.document}>
          <span className={styles.appName}>RustMind</span>
          <span className={styles.documentName}>
            {isDirty ? '● ' : ''}
            {documentName}
          </span>
        </div>
      </div>

      <div className={styles.actions} aria-label="Actions">
        {onHome && (
          <>
            <IconButton icon="home" label={t('toolbar.home')} onClick={onHome} />
            <span className={styles.separator} aria-hidden="true" />
          </>
        )}
        <IconButton icon="file" label={t('toolbar.new')} onClick={onNew} />
        <IconButton icon="folder-open" label={t('toolbar.open')} onClick={onOpen} />
        <IconButton icon="save" label={t('toolbar.save')} onClick={onSave} />
        <IconButton icon="save-as" label={t('toolbar.saveAs')} onClick={onSaveAs} />
        <span className={styles.separator} aria-hidden="true" />
        <IconButton icon="undo" label={t('toolbar.undo')} onClick={undo} disabled={!canUndo} />
        <IconButton icon="redo" label={t('toolbar.redo')} onClick={redo} disabled={!canRedo} />
        <span className={styles.separator} aria-hidden="true" />
        <IconButton icon="layout" label={t('toolbar.autoLayout')} onClick={handleAutoLayout} />
        <span className={styles.separator} aria-hidden="true" />
        {/* Temporary handle-visibility switcher — full UI arrives at step 15/16 */}
        <select
          className={styles.handleVisSelect}
          value={projectSettings.handleVisibility}
          title={t('toolbar.handleVisibility')}
          onChange={(e) =>
            setProjectSettings({ handleVisibility: e.target.value as HandleVisibility })
          }
        >
          <option value="hidden">{t('toolbar.handlesHidden')}</option>
          <option value="dashed">{t('toolbar.handlesDashed')}</option>
          <option value="always">{t('toolbar.handlesAlways')}</option>
        </select>
        <IconButton
          icon="sliders"
          label={t('toolbar.stylePanel')}
          onClick={toggleInspector}
          active={inspectorOpen}
        />
        <IconButton
          icon={theme === 'dark' ? 'sun' : 'moon'}
          label={theme === 'dark' ? t('toolbar.lightTheme') : t('toolbar.darkTheme')}
          onClick={toggleTheme}
        />
        <IconButton icon="settings" label={t('toolbar.settings')} onClick={openSettings} />
      </div>
    </header>
  );
}
