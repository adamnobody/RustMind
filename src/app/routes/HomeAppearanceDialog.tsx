import clsx from 'clsx';
import { Modal } from '../../shared/ui/Modal/Modal';
import { SegmentedControl } from '../../shared/ui/SegmentedControl/SegmentedControl';
import { Switch } from '../../shared/ui/Switch/Switch';
import {
  useUIStore,
  type HomeAnimation,
  type HomePalette,
  type Theme,
} from '../../store/uiStore';
import { HOME_PALETTES } from './homePalettes';
import styles from './HomeAppearanceDialog.module.css';

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Тёмная' },
  { value: 'light', label: 'Светлая' },
];

const animationOptions: { value: HomeAnimation; label: string }[] = [
  { value: 'off', label: 'Выкл' },
  { value: 'calm', label: 'Спокойная' },
  { value: 'lively', label: 'Живая' },
];

const paletteOrder: HomePalette[] = ['iridescent', 'aurora', 'sunset', 'ocean', 'mono'];

interface HomeAppearanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Настройки внешнего вида главного меню. Все значения пишутся в uiStore и
 * применяются мгновенно — фон за модалкой служит живым предпросмотром.
 */
export function HomeAppearanceDialog({
  isOpen,
  onClose,
}: HomeAppearanceDialogProps): React.JSX.Element {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const settings = useUIStore((s) => s.settings);
  const setHomePalette = useUIStore((s) => s.setHomePalette);
  const setHomeAnimation = useUIStore((s) => s.setHomeAnimation);
  const setHomeGrain = useUIStore((s) => s.setHomeGrain);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Внешний вид">
      <div className={styles.body}>
        <SegmentedControl label="Тема" value={theme} options={themeOptions} onChange={setTheme} />

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Палитра фона</span>
          <div className={styles.palettes} role="radiogroup" aria-label="Палитра фона">
            {paletteOrder.map((key) => {
              const { label, colors } = HOME_PALETTES[key];
              const active = settings.homePalette === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={clsx(styles.palette, active && styles.paletteActive)}
                  onClick={() => setHomePalette(key)}
                >
                  <span
                    className={styles.swatch}
                    style={{
                      background: `linear-gradient(120deg, ${colors[0]}, ${colors[1]} 50%, ${colors[2]})`,
                    }}
                  />
                  <span className={styles.paletteLabel}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <SegmentedControl
          label="Анимация фона"
          value={settings.homeAnimation}
          options={animationOptions}
          onChange={setHomeAnimation}
        />

        <Switch
          label="Зерно плёнки"
          description="Едва заметная текстура поверх фона."
          checked={settings.homeGrain}
          onCheckedChange={setHomeGrain}
        />
      </div>
    </Modal>
  );
}
