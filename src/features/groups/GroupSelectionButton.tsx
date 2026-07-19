import { useUIStore } from '../../store/uiStore';
import { useMindMapStore } from '../../store/mindMapStore';
import { useT } from '../../shared/i18n';
import { Icon } from '../../shared/ui/Icon/Icon';
import styles from './GroupSelectionButton.module.css';

/**
 * Плавающая кнопка «Сгруппировать» — появляется при выделении ≥2 узлов.
 * Создаёт группу из текущего выделения (то же, что Ctrl+G).
 */
export function GroupSelectionButton(): React.JSX.Element | null {
  const t = useT();
  const selectedNodeIds = useUIStore((s) => s.selectedNodeIds);
  const setSelectedGroupId = useUIStore((s) => s.setSelectedGroupId);
  const createGroup = useMindMapStore((s) => s.createGroup);

  if (selectedNodeIds.length < 2) return null;

  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => {
        const gid = createGroup(selectedNodeIds);
        if (gid) setSelectedGroupId(gid);
      }}
    >
      <Icon name="group" size={16} />
      <span>
        {t('group.groupSelection')} ({selectedNodeIds.length})
      </span>
    </button>
  );
}
