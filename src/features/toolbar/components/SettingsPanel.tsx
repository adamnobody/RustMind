import { Drawer } from '../../../shared/ui/Drawer/Drawer';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl/SegmentedControl';
import { Switch } from '../../../shared/ui/Switch/Switch';
import {
  useUIStore,
  type BackgroundPattern,
  type NodeFontSize,
  type Theme,
} from '../../../store/uiStore';
import { useT } from '../../../shared/i18n';
import styles from './SettingsPanel.module.css';

const nodeFontOptions: { value: NodeFontSize; label: string }[] = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
];

const themeValues: Theme[] = ['dark', 'light'];
const patternValues: BackgroundPattern[] = ['dots', 'lines', 'cross'];

export function SettingsPanel(): React.JSX.Element {
  const t = useT();
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

  const themeOptions = themeValues.map((value) => ({ value, label: t(`theme.${value}`) }));
  const patternOptions = patternValues.map((value) => ({ value, label: t(`pattern.${value}`) }));

  return (
    <Drawer isOpen={isOpen} title={t('settings.title')} onClose={closeSettings}>
      <div className={styles.sections}>
        <section className={styles.section}>
          <h3 className={styles.heading}>{t('settings.appearance')}</h3>
          <SegmentedControl
            label={t('settings.theme')}
            value={theme}
            options={themeOptions}
            onChange={setTheme}
          />
          <SegmentedControl
            label={t('settings.nodeFontSize')}
            value={settings.nodeFontSize}
            options={nodeFontOptions}
            onChange={setNodeFontSize}
          />
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>{t('settings.canvas')}</h3>
          <Switch
            label={t('settings.showBackground')}
            checked={settings.showGrid}
            onCheckedChange={(value) => setCanvasOption('showGrid', value)}
          />
          {settings.showGrid && (
            <>
              <SegmentedControl
                label={t('settings.bgPattern')}
                value={settings.backgroundPattern}
                options={patternOptions}
                onChange={setBackgroundPattern}
              />
              <div className={styles.rangeField}>
                <div className={styles.rangeHeader}>
                  <span className={styles.rangeLabel}>{t('settings.patternBrightness')}</span>
                  <span className={styles.rangeValue}>{settings.backgroundBrightness}%</span>
                </div>
                <input
                  type="range"
                  className={styles.range}
                  min={4}
                  max={80}
                  value={settings.backgroundBrightness}
                  aria-label={t('settings.patternBrightness')}
                  onChange={(e) => setBackgroundBrightness(Number(e.target.value))}
                />
              </div>
            </>
          )}
          <Switch
            label={t('settings.minimap')}
            checked={settings.showMiniMap}
            onCheckedChange={(value) => setCanvasOption('showMiniMap', value)}
          />
          <Switch
            label={t('settings.zoomButtons')}
            checked={settings.showControls}
            onCheckedChange={(value) => setCanvasOption('showControls', value)}
          />
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>{t('settings.behavior')}</h3>
          <Switch
            label={t('settings.confirmDelete')}
            description={t('settings.confirmDeleteDesc')}
            checked={settings.confirmBranchDelete}
            onCheckedChange={(value) => setBehaviorOption('confirmBranchDelete', value)}
          />
        </section>

        <section className={styles.about}>
          <h3 className={styles.heading}>{t('settings.about')}</h3>
          <p className={styles.aboutTitle}>RustMind 0.1.0</p>
          <p className={styles.aboutText}>{t('settings.aboutText')}</p>
        </section>
      </div>
    </Drawer>
  );
}
