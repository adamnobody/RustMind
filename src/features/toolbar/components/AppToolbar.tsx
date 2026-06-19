import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import styles from './AppToolbar.module.css';

export function AppToolbar(): React.JSX.Element {
  const documentName = useMindMapStore((s) => s.documentName);
  const isDirty = useMindMapStore((s) => s.isDirty);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const openSettings = useUIStore((s) => s.openSettings);

  return (
    <header className={styles.toolbar}>
      <div className={styles.brand}>
        <div className={styles.logo} aria-hidden="true">
          R
        </div>
        <div className={styles.document}>
          <span className={styles.appName}>RustMind</span>
          <span className={styles.documentName}>
            {documentName}
            {isDirty ? ' *' : ''}
          </span>
        </div>
      </div>

      <div className={styles.actions} aria-label="Действия редактора">
        <IconButton icon="undo" label="Отменить (скоро)" disabled />
        <IconButton icon="redo" label="Повторить (скоро)" disabled />
        <span className={styles.separator} aria-hidden="true" />
        <IconButton icon="layout" label="Авто-layout (шаг 8)" disabled />
        <IconButton
          icon={theme === 'dark' ? 'sun' : 'moon'}
          label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          onClick={toggleTheme}
        />
        <IconButton icon="settings" label="Настройки" onClick={openSettings} />
      </div>
    </header>
  );
}
