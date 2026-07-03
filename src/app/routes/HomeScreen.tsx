import { useCallback, useState } from 'react';
import { useMindMapStore } from '../../store/mindMapStore';
import {
  fileService,
  openDocumentFromPath,
  getRecentFiles,
  removeRecentFile,
  type RecentFile,
} from '../../features/persistence';
import { Icon } from '../../shared/ui/Icon/Icon';
import { IconButton } from '../../shared/ui/IconButton/IconButton';
import { HomeBackdrop } from './HomeBackdrop';
import { HomeAppearanceDialog } from './HomeAppearanceDialog';
import styles from './HomeScreen.module.css';

interface HomeScreenProps {
  /** Вызывается, когда документ готов (новый или открытый) — переключает на редактор. */
  onEnterEditor: () => void;
}

function formatOpenedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HomeScreen({ onEnterEditor }: HomeScreenProps): React.JSX.Element {
  // Снимок на маунт: список меняется только действиями на этом же экране,
  // поэтому обновляем state вручную после удаления записи.
  const [recent, setRecent] = useState<RecentFile[]>(() => getRecentFiles());
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const handleCreate = useCallback(() => {
    useMindMapStore.getState().resetDocument();
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
      window.alert(`Ошибка: ${message}`);
    }
  }, [onEnterEditor]);

  const handleOpenRecent = useCallback(
    async (file: RecentFile) => {
      try {
        await openDocumentFromPath(file.path);
        onEnterEditor();
      } catch {
        // Файл переехал/удалён — сообщаем и убираем мёртвую запись из списка.
        window.alert(`Не удалось открыть «${file.name}». Файл убран из недавних.`);
        removeRecentFile(file.path);
        setRecent(getRecentFiles());
      }
    },
    [onEnterEditor],
  );

  const handleRemoveRecent = useCallback((path: string) => {
    removeRecentFile(path);
    setRecent(getRecentFiles());
  }, []);

  return (
    <div className={styles.screen}>
      <HomeBackdrop />

      <button
        type="button"
        className={styles.appearanceButton}
        onClick={() => setAppearanceOpen(true)}
      >
        <Icon name="palette" size={16} />
        Внешний вид
      </button>

      <div className={styles.content}>
        <header className={styles.hero}>
          <div className={styles.logo} aria-hidden="true">
            R
          </div>
          <div>
            <h1 className={styles.title}>RustMind</h1>
            <p className={styles.subtitle}>Редактор интеллект-карт, схем и блок-схем</p>
          </div>
        </header>

        <div className={styles.actions}>
          <button type="button" className={styles.actionCard} onClick={handleCreate}>
            <span className={styles.actionIcon}>
              <Icon name="plus" size={22} />
            </span>
            <span className={styles.actionBody}>
              <span className={styles.actionTitle}>Создать новую карту</span>
              <span className={styles.actionHint}>Чистый холст с корневой темой</span>
            </span>
          </button>

          <button
            type="button"
            className={styles.actionCard}
            onClick={() => void handleOpenDialog()}
          >
            <span className={styles.actionIcon}>
              <Icon name="folder-open" size={22} />
            </span>
            <span className={styles.actionBody}>
              <span className={styles.actionTitle}>Открыть файл…</span>
              <span className={styles.actionHint}>Документ .rustmind с диска</span>
            </span>
          </button>
        </div>

        <section className={styles.recentSection} aria-label="Недавние файлы">
          <h2 className={styles.recentHeading}>Недавние</h2>
          {recent.length === 0 ? (
            <p className={styles.recentEmpty}>
              Здесь появятся последние открытые карты.
            </p>
          ) : (
            <ul className={styles.recentList}>
              {recent.map((file) => (
                <li key={file.path} className={styles.recentItem}>
                  <button
                    type="button"
                    className={styles.recentButton}
                    title={file.path}
                    onClick={() => void handleOpenRecent(file)}
                  >
                    <span className={styles.recentIcon}>
                      <Icon name="file" size={18} />
                    </span>
                    <span className={styles.recentBody}>
                      <span className={styles.recentName}>{file.name}</span>
                      <span className={styles.recentPath}>{file.path}</span>
                    </span>
                    <span className={styles.recentDate}>{formatOpenedAt(file.openedAt)}</span>
                  </button>
                  <span className={styles.recentRemove}>
                    <IconButton
                      icon="x"
                      label={`Убрать «${file.name}» из недавних`}
                      onClick={() => handleRemoveRecent(file.path)}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <HomeAppearanceDialog isOpen={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </div>
  );
}
