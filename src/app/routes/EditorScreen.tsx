import { MindMapCanvas } from '../../features/canvas';
import { AppToolbar, SettingsPanel } from '../../features/toolbar';
import { usePersistence, useWindowCloseGuard } from '../../features/persistence';
import { KeyboardProvider } from '../providers/KeyboardProvider';
import styles from './EditorScreen.module.css';

export function EditorScreen(): React.JSX.Element {
  const { handleSave, handleSaveAs, handleOpen, handleNew } = usePersistence();
  useWindowCloseGuard();

  return (
    <KeyboardProvider
      onSave={handleSave}
      onSaveAs={handleSaveAs}
      onOpen={handleOpen}
      onNew={handleNew}
    >
      <div className={styles.editor}>
        <AppToolbar
          onNew={handleNew}
          onOpen={handleOpen}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
        />
        <div className={styles.canvasWrapper}>
          <MindMapCanvas />
        </div>
        <SettingsPanel />
      </div>
    </KeyboardProvider>
  );
}
