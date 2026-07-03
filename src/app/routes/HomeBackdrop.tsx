import type { CSSProperties } from 'react';
import { useUIStore } from '../../store/uiStore';
import { HOME_PALETTES } from './homePalettes';
import styles from './HomeBackdrop.module.css';

/**
 * Анимированный «жидкий» фон главного меню.
 *
 * Устройство (см. CSS): весь экран залит тонированной базой (цвета палитры,
 * подмешанные к цвету темы — тёмных «дыр» нет в принципе), а поверх дрейфуют
 * два огромных слоя, каждый из которых несёт по 3–4 перекрывающихся
 * radial-gradient'а. Слои вращаются в противоположные стороны с разным
 * периодом и смешиваются (screen/multiply), поэтому цвета непрерывно
 * перетекают друг через друга — расплавленное стекло, а не отдельные круги.
 *
 * Палитра приходит тремя CSS-переменными; темп — data-anim;
 * prefers-reduced-motion останавливает движение полностью.
 */
export function HomeBackdrop(): React.JSX.Element {
  const palette = useUIStore((s) => s.settings.homePalette);
  const animation = useUIStore((s) => s.settings.homeAnimation);
  const grain = useUIStore((s) => s.settings.homeGrain);

  const { colors } = HOME_PALETTES[palette] ?? HOME_PALETTES.iridescent;

  return (
    <div
      className={styles.backdrop}
      data-anim={animation}
      aria-hidden="true"
      style={
        {
          '--c1': colors[0],
          '--c2': colors[1],
          '--c3': colors[2],
        } as CSSProperties
      }
    >
      <div className={styles.base} />
      <div className={styles.layerA} />
      <div className={styles.layerB} />
      {grain && <div className={styles.grain} />}
      <div className={styles.veil} />
    </div>
  );
}
