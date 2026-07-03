import { Drawer } from '../../../shared/ui/Drawer/Drawer';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl/SegmentedControl';
import { Switch } from '../../../shared/ui/Switch/Switch';
import {
  useUIStore,
  type BackgroundPattern,
  type NodeFontSize,
  type Theme,
} from '../../../store/uiStore';
import styles from './SettingsPanel.module.css';

const nodeFontOptions: { value: NodeFontSize; label: string }[] = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
];

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Тёмная' },
  { value: 'light', label: 'Светлая' },
];

const patternOptions: { value: BackgroundPattern; label: string }[] = [
  { value: 'dots', label: 'Точки' },
  { value: 'lines', label: 'Линии' },
  { value: 'cross', label: 'Кресты' },
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
  const setBackgroundPattern = useUIStore((s) => s.setBackgroundPattern);
  const setBackgroundBrightness = useUIStore((s) => s.setBackgroundBrightness);

  return (
    <Drawer isOpen={isOpen} title="Настройки" onClose={closeSettings}>
      <div className={styles.sections}>
        <section className={styles.section}>
          <h3 className={styles.heading}>Внешний вид</h3>
          <SegmentedControl label="Тема" value={theme} options={themeOptions} onChange={setTheme} />
          <SegmentedControl
            label="Размер шрифта узлов"
            value={settings.nodeFontSize}
            options={nodeFontOptions}
            onChange={setNodeFontSize}
          />
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Холст</h3>
          <Switch
            label="Показывать фон"
            checked={settings.showGrid}
            onCheckedChange={(value) => setCanvasOption('showGrid', value)}
          />
          {settings.showGrid && (
            <>
              <SegmentedControl
                label="Паттерн фона"
                value={settings.backgroundPattern}
                options={patternOptions}
                onChange={setBackgroundPattern}
              />
              <div className={styles.rangeField}>
                <div className={styles.rangeHeader}>
                  <span className={styles.rangeLabel}>Яркость паттерна</span>
                  <span className={styles.rangeValue}>{settings.backgroundBrightness}%</span>
                </div>
                <input
                  type="range"
                  className={styles.range}
                  min={4}
                  max={80}
                  value={settings.backgroundBrightness}
                  aria-label="Яркость паттерна"
                  onChange={(e) => setBackgroundBrightness(Number(e.target.value))}
                />
              </div>
            </>
          )}
          <Switch
            label="Мини-карта"
            checked={settings.showMiniMap}
            onCheckedChange={(value) => setCanvasOption('showMiniMap', value)}
          />
          <Switch
            label="Кнопки масштаба"
            checked={settings.showControls}
            onCheckedChange={(value) => setCanvasOption('showControls', value)}
          />
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Поведение</h3>
          <Switch
            label="Авто-раскладка при изменениях"
            description="Пересчитывать раскладку при добавлении и удалении узлов."
            checked={settings.autoLayoutOnChange}
            onCheckedChange={(value) => setBehaviorOption('autoLayoutOnChange', value)}
          />
          <Switch
            label="Подтверждать удаление ветки"
            description="Показывать подтверждение перед удалением ветки."
            checked={settings.confirmBranchDelete}
            onCheckedChange={(value) => setBehaviorOption('confirmBranchDelete', value)}
          />
        </section>

        <section className={styles.about}>
          <h3 className={styles.heading}>О приложении</h3>
          <p className={styles.aboutTitle}>RustMind 0.1.0</p>
          <p className={styles.aboutText}>
            Быстрый десктопный редактор интеллект-карт на Tauri, React и React Flow.
          </p>
        </section>
      </div>
    </Drawer>
  );
}
