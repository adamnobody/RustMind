import { MindMapCanvas } from '../../features/canvas';
import { AppToolbar, SettingsPanel } from '../../features/toolbar';
import { Inspector } from '../../features/inspector';
import { usePersistence, useWindowCloseGuard } from '../../features/persistence';
import { KeyboardProvider } from '../providers/KeyboardProvider';
import styles from './EditorScreen.module.css';

interface EditorScreenProps {
  /** Возврат на стартовый экран (с подтверждением при несохранённых изменениях). */
  onGoHome?: () => void;
}

export function EditorScreen({ onGoHome }: EditorScreenProps = {}): React.JSX.Element {
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
          onHome={onGoHome}
        />
        <div className={styles.canvasWrapper}>
          <div className={styles.canvasArea}>
            <MindMapCanvas />
          </div>
          <Inspector />
        </div>
        <SettingsPanel />
      </div>
    </KeyboardProvider>
  );
}
