import type { CSSProperties } from 'react';
import { useUIStore } from '../../store/uiStore';
import { HOME_PALETTES } from './homePalettes';
import styles from './HomeBackdrop.module.css';

/**
 * Анимированный фон главного меню: три огромных размытых цветовых пятна
 * медленно дрейфуют и «переливаются» друг в друга (CSS-анимация трансформов —
 * без canvas и таймеров). Темп управляется data-anim через CSS-переменную,
 * `prefers-reduced-motion` полностью останавливает движение. Поверх — слой
 * зерна (SVG feTurbulence) и вуаль цвета темы, чтобы контент читался.
 */
export function HomeBackdrop(): React.JSX.Element {
  const palette = useUIStore((s) => s.settings.homePalette);
  const animation = useUIStore((s) => s.settings.homeAnimation);
  const grain = useUIStore((s) => s.settings.homeGrain);

  const { colors } = HOME_PALETTES[palette] ?? HOME_PALETTES.iridescent;

  return (
    <div className={styles.backdrop} data-anim={animation} aria-hidden="true">
      <div
        className={`${styles.blob} ${styles.blobA}`}
        style={{ '--blob-color': colors[0] } as CSSProperties}
      />
      <div
        className={`${styles.blob} ${styles.blobB}`}
        style={{ '--blob-color': colors[1] } as CSSProperties}
      />
      <div
        className={`${styles.blob} ${styles.blobC}`}
        style={{ '--blob-color': colors[2] } as CSSProperties}
      />
      {grain && <div className={styles.grain} />}
      <div className={styles.veil} />
    </div>
  );
}
