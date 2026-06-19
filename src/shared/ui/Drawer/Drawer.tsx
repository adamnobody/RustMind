import { useEffect } from 'react';
import { IconButton } from '../IconButton/IconButton';
import styles from './Drawer.module.css';

interface DrawerProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Drawer({ isOpen, title, onClose, children }: DrawerProps): React.JSX.Element | null {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <aside
        className={styles.drawer}
        aria-modal="true"
        role="dialog"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>RustMind</p>
            <h2 className={styles.title}>{title}</h2>
          </div>
          <IconButton icon="x" label="Закрыть настройки" onClick={onClose} />
        </header>
        <div className={styles.content}>{children}</div>
      </aside>
    </div>
  );
}
