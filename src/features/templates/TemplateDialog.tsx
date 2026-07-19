import { useMindMapStore } from '../../store/mindMapStore';
import { useUIStore } from '../../store/uiStore';
import { useT, translate } from '../../shared/i18n';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Icon } from '../../shared/ui/Icon/Icon';
import { TEMPLATES, buildTemplate, type TemplateDef } from './templates';
import styles from './TemplateDialog.module.css';

/**
 * Диалог стартовых шаблонов. Открывается из меню «Файл». Выбор строит документ
 * из шаблона и заменяет текущий (с подтверждением при несохранённых изменениях).
 */
export function TemplateDialog(): React.JSX.Element | null {
  const isOpen = useUIStore((s) => s.isTemplatePickerOpen);
  const close = useUIStore((s) => s.closeTemplatePicker);
  const locale = useUIStore((s) => s.locale);
  const triggerFitView = useUIStore((s) => s.triggerFitView);
  const t = useT();

  const pick = (def: TemplateDef): void => {
    const st = useMindMapStore.getState();
    if (st.isDirty && !window.confirm(translate('dialog.unsavedNew'))) return;
    st.loadDocument(buildTemplate(def, locale));
    st.setFilePath(null);
    st.markDirty(); // шаблон не сохранён в файл
    close();
    setTimeout(triggerFitView, 80);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} title={t('templatePicker.title')}>
      <div className={styles.grid}>
        {TEMPLATES.map((def) => (
          <button key={def.id} type="button" className={styles.card} onClick={() => pick(def)}>
            <Icon name="template" size={24} />
            <span className={styles.cardLabel}>{def.title[locale]}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
