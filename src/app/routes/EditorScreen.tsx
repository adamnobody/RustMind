import { MindMapCanvas } from '../../features/canvas';
import styles from './EditorScreen.module.css';

export function EditorScreen(): React.JSX.Element {
  return (
    <div className={styles.editor}>
      {/* TopBar добавим на шаге 9 */}
      <div className={styles.canvasWrapper}>
        <MindMapCanvas />
      </div>
    </div>
  );
}
