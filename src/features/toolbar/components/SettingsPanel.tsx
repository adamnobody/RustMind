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
    <Drawer isOpen={isOpen} title="Settings" onClose={closeSettings}>
      <div className={styles.sections}>
        <section className={styles.section}>
          <h3 className={styles.heading}>Appearance</h3>
          <SegmentedControl label="Theme" value={theme} options={themeOptions} onChange={setTheme} />
          <SegmentedControl
            label="Node font size"
            value={settings.nodeFontSize}
            options={nodeFontOptions}
            onChange={setNodeFontSize}
          />
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Canvas</h3>
          <Switch
            label="Show grid"
            checked={settings.showGrid}
            onCheckedChange={(value) => setCanvasOption('showGrid', value)}
          />
          <Switch
            label="Show mini-map"
            checked={settings.showMiniMap}
            onCheckedChange={(value) => setCanvasOption('showMiniMap', value)}
          />
          <Switch
            label="Show zoom controls"
            checked={settings.showControls}
            onCheckedChange={(value) => setCanvasOption('showControls', value)}
          />
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Behaviour</h3>
          <Switch
            label="Auto-layout on changes"
            description="Re-layout automatically when nodes are added or deleted."
            checked={settings.autoLayoutOnChange}
            onCheckedChange={(value) => setBehaviorOption('autoLayoutOnChange', value)}
          />
          <Switch
            label="Confirm branch delete"
            description="Show a confirmation dialog before deleting a branch."
            checked={settings.confirmBranchDelete}
            onCheckedChange={(value) => setBehaviorOption('confirmBranchDelete', value)}
          />
        </section>

        <section className={styles.about}>
          <h3 className={styles.heading}>About</h3>
          <p className={styles.aboutTitle}>RustMind 0.1.0</p>
          <p className={styles.aboutText}>
            Fast desktop mind-map editor built on Tauri, React, and React Flow.
          </p>
        </section>
      </div>
    </Drawer>
  );
}
