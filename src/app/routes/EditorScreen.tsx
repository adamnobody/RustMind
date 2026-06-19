import { MindMapCanvas } from '../../features/canvas';
import { AppToolbar, SettingsPanel } from '../../features/toolbar';
import styles from './EditorScreen.module.css';

export function EditorScreen(): React.JSX.Element {
  return (
    <div className={styles.editor}>
      <AppToolbar />
      <div className={styles.canvasWrapper}>
        <MindMapCanvas />
      </div>
      <SettingsPanel />
    </div>
  );
}
