import { useEffect } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import { useT } from '../../../shared/i18n';
import { Modal } from '../../../shared/ui/Modal/Modal';
import { Button } from '../../../shared/ui/Button/Button';
import styles from './StatusCascadeDialog.module.css';

/**
 * Спрашивает, проставить ли тот же статус дочерним узлам. Закрытие/Escape —
 * отмена (родитель тоже не меняется). Нет — только родитель. Да — вся ветка.
 */
export function StatusCascadeDialog(): React.JSX.Element | null {
  const prompt = useUIStore((s) => s.statusCascadePrompt);
  const close = useUIStore((s) => s.closeStatusCascadePrompt);
  const t = useT();

  useEffect(() => {
    if (!prompt) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt, close]);

  if (!prompt) return null;

  const apply = (cascade: boolean): void => {
    useMindMapStore.getState().updateNodeData(prompt.nodeId, { status: prompt.status }, {
      cascadeStatus: cascade,
    });
    close();
  };

  return (
    <Modal isOpen onClose={close} title={t('dialog.statusCascadeTitle')}>
      <p className={styles.text}>{t('dialog.confirmStatusChildren')}</p>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={() => apply(false)}>
          {t('dialog.no')}
        </Button>
        <Button type="button" variant="primary" autoFocus onClick={() => apply(true)}>
          {t('dialog.yes')}
        </Button>
      </div>
    </Modal>
  );
}
