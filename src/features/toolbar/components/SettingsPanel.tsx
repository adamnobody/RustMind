import { useRef } from 'react';
import { Drawer } from '../../../shared/ui/Drawer/Drawer';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl/SegmentedControl';
import { Switch } from '../../../shared/ui/Switch/Switch';
import { Icon } from '../../../shared/ui/Icon/Icon';
import {
  useUIStore,
  type BackgroundPattern,
  type NodeFontSize,
  type Theme,
} from '../../../store/uiStore';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useT } from '../../../shared/i18n';
import styles from './SettingsPanel.module.css';

const nodeFontOptions: { value: NodeFontSize; label: string }[] = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
];

const themeValues: Theme[] = ['dark', 'light'];
const patternValues: BackgroundPattern[] = ['dots', 'lines', 'cross'];

const LEVEL_SEEDS = ['#2563eb', '#16a34a', '#d97706'];

/** Строка выбора цвета с кнопкой сброса (для стилей проекта). */
function ColorRow({
  label,
  value,
  seed,
  onChange,
  onClear,
  clearLabel,
}: {
  label: string;
  value: string | undefined;
  seed: string;
  onChange: (hex: string) => void;
  onClear: () => void;
  clearLabel: string;
}): React.JSX.Element {
  const set = value !== undefined && value !== '';
  return (
    <div className={styles.colorRow}>
      <span className={styles.colorLabel}>{label}</span>
      <input
        type="color"
        className={styles.colorInput}
        value={set ? value : seed}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className={styles.colorClear}
        aria-label={clearLabel}
        disabled={!set}
        onClick={onClear}
      >
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}

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
  const projectSettings = useMindMapStore((s) => s.projectSettings);
  const setProjectSettings = useMindMapStore((s) => s.setProjectSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImageFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = ''; // разрешить повторный выбор того же файла
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProjectSettings({ backgroundImage: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const setLevelColor = (index: number, hex: string | undefined): void => {
    const arr = [...(projectSettings.levelColors ?? [])];
    while (arr.length <= index) arr.push('');
    arr[index] = hex ?? '';
    setProjectSettings({ levelColors: arr.some((c) => c) ? arr : undefined });
  };

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

        <section className={styles.section}>
          <h3 className={styles.heading}>{t('settings.projectStyle')}</h3>
          <ColorRow
            label={t('settings.bgColor')}
            value={projectSettings.backgroundColor}
            seed="#0a0e12"
            onChange={(hex) => setProjectSettings({ backgroundColor: hex })}
            onClear={() => setProjectSettings({ backgroundColor: undefined })}
            clearLabel={t('settings.clear')}
          />
          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>{t('settings.bgImage')}</span>
            <button
              type="button"
              className={styles.textBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              {projectSettings.backgroundImage ? t('settings.changeImage') : t('settings.setImage')}
            </button>
            <button
              type="button"
              className={styles.colorClear}
              aria-label={t('settings.clear')}
              disabled={!projectSettings.backgroundImage}
              onClick={() => setProjectSettings({ backgroundImage: undefined })}
            >
              <Icon name="x" size={13} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onImageFile}
            />
          </div>
          <ColorRow
            label={t('settings.edgeColorAll')}
            value={projectSettings.edgeColor}
            seed="#8fa3ad"
            onChange={(hex) => setProjectSettings({ edgeColor: hex })}
            onClear={() => setProjectSettings({ edgeColor: undefined })}
            clearLabel={t('settings.clear')}
          />
          <span className={styles.subLabel}>{t('settings.levelColors')}</span>
          {LEVEL_SEEDS.map((seed, i) => (
            <ColorRow
              key={i}
              label={t('settings.level', { n: String(i + 1) })}
              value={projectSettings.levelColors?.[i]}
              seed={seed}
              onChange={(hex) => setLevelColor(i, hex)}
              onClear={() => setLevelColor(i, undefined)}
              clearLabel={t('settings.clear')}
            />
          ))}
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
