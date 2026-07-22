import type { BorderPattern, NodeShape } from '../../nodes/types';
import type { EdgeArrowType, EdgeLinePattern } from '../../edges/types';
import styles from './Inspector.module.css';

/**
 * Значки внутри сегментированных переключателей панели. В прототипе они
 * нарисованы CSS-боксами (а не иконочным шрифтом), поэтому повторяем тем же
 * приёмом: рамка/линия наследуют currentColor кнопки, размеры — из прототипа.
 */

const SHAPE_GEOMETRY: Record<NodeShape, { w: number; h: number; radius: string; rotate?: boolean }> =
  {
    rect: { w: 24, h: 14, radius: '1px' },
    rounded: { w: 18, h: 18, radius: '5px' },
    ellipse: { w: 18, h: 18, radius: '50%' },
    diamond: { w: 13, h: 13, radius: '3px', rotate: true },
  };

export function ShapeGlyph({ shape }: { shape: NodeShape }): React.JSX.Element {
  const g = SHAPE_GEOMETRY[shape];
  return (
    <span
      className={styles.shapeGlyph}
      style={{
        width: g.w,
        height: g.h,
        borderRadius: g.radius,
        transform: g.rotate === true ? 'rotate(45deg)' : undefined,
      }}
    />
  );
}

export function BorderGlyph({ pattern }: { pattern: BorderPattern }): React.JSX.Element {
  if (pattern === 'none') {
    return <span style={{ fontSize: 16 }}>∅</span>;
  }
  return <span className={styles.lineGlyph} style={{ borderTopStyle: pattern }} />;
}

export function LinePatternGlyph({ pattern }: { pattern: EdgeLinePattern }): React.JSX.Element {
  return <span className={styles.lineGlyph} style={{ borderTopStyle: pattern }} />;
}

/**
 * Наконечник связи в мини-масштабе: короткий отрезок + сама форма конца, чтобы
 * вариант читался так же, как он выглядит на холсте.
 */
export function ArrowGlyph({
  arrow,
  direction,
}: {
  arrow: EdgeArrowType;
  direction: 'start' | 'end';
}): React.JSX.Element {
  const flip = direction === 'start';
  return (
    <svg
      viewBox="0 0 28 16"
      width={28}
      height={16}
      aria-hidden="true"
      focusable="false"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d={arrow === 'none' ? 'M 3 8 L 25 8' : 'M 3 8 L 18 8'}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {arrow === 'open' && (
        <path
          d="M 18 3.5 L 24.5 8 L 18 12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {arrow === 'filled' && <path d="M 18 3.5 L 25 8 L 18 12.5 Z" fill="currentColor" />}
      {arrow === 'dot' && <circle cx={21.5} cy={8} r={3.4} fill="currentColor" />}
      {arrow === 'diamond' && <path d="M 21.5 4 L 25.5 8 L 21.5 12 L 17.5 8 Z" fill="currentColor" />}
    </svg>
  );
}

/**
 * Мини-схема варианта геометрии: тот же путь в координатах 28×16, что рисует
 * соответствующий маршрут на канвасе — вариант узнаётся глазом, а не по тексту.
 */
export function RoutingGlyph({ d, dashed }: { d: string; dashed?: boolean }): React.JSX.Element {
  return (
    <svg viewBox="0 0 28 16" width={28} height={16} aria-hidden="true" focusable="false">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed === true ? '3 2.5' : undefined}
      />
    </svg>
  );
}
