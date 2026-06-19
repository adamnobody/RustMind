import { Drawer } from '../../../shared/ui/Drawer/Drawer';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl/SegmentedControl';
import { Switch } from '../../../shared/ui/Switch/Switch';
import { useUIStore, type NodeFontSize, type Theme } from '../../../store/uiStore';
import styles from './SettingsPanel.module.css';

const nodeFontOptions: { value: NodeFontSize; label: string }[] = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
];

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export function SettingsPanel(): React.JSX.Element {
  const isOpen = useUIStore((s) => s.isSettingsOpen);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const settings = useUIStore((s) => s.settings);
  const setNodeFontSize = useUIStore((s) => s.setNodeFontSize);
  const setCanvasOption = useUIStore((s) => s.setCanvasOption);
  const setBehaviorOption = useUIStore((s) => s.setBehaviorOption);

  return (
    <Drawer isOpen={isOpen} title="Настройки" onClose={closeSettings}>
      <div className={styles.sections}>
        <section className={styles.section}>
          <h3 className={styles.heading}>Внешний вид</h3>
          <SegmentedControl label="Тема" value={theme} options={themeOptions} onChange={setTheme} />
          <SegmentedControl
            label="Размер текста узлов"
            value={settings.nodeFontSize}
            options={nodeFontOptions}
            onChange={setNodeFontSize}
          />
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Холст</h3>
          <Switch
            label="Показывать сетку"
            checked={settings.showGrid}
            onCheckedChange={(value) => setCanvasOption('showGrid', value)}
          />
          <Switch
            label="Показывать мини-карту"
            checked={settings.showMiniMap}
            onCheckedChange={(value) => setCanvasOption('showMiniMap', value)}
          />
          <Switch
            label="Показывать контролы зума"
            checked={settings.showControls}
            onCheckedChange={(value) => setCanvasOption('showControls', value)}
          />
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Поведение</h3>
          <Switch
            label="Авто-layout при изменениях"
            description="TODO: подключим вместе с Dagre-layout на шаге 8."
            checked={settings.autoLayoutOnChange}
            onCheckedChange={(value) => setBehaviorOption('autoLayoutOnChange', value)}
          />
          <Switch
            label="Подтверждать удаление ветки"
            description="TODO: диалог подтверждения появится после слоя persistence."
            checked={settings.confirmBranchDelete}
            onCheckedChange={(value) => setBehaviorOption('confirmBranchDelete', value)}
          />
        </section>

        <section className={styles.about}>
          <h3 className={styles.heading}>О программе</h3>
          <p className={styles.aboutTitle}>RustMind 0.1.0</p>
          <p className={styles.aboutText}>
            Быстрый desktop-редактор mind map, схем и блок-схем на Tauri, React и React Flow.
          </p>
        </section>
      </div>
    </Drawer>
  );
}
