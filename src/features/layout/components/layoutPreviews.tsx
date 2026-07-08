import type { LayoutKind } from '../engines/layoutTypes';
import styles from './LayoutTypeDialog.module.css';

/**
 * Мини-схемы для диалога выбора типа карты: у каждого типа — свой узнаваемый
 * скелет (не иллюстрация реального рендера, а достаточная для различения
 * геометрия). Общий язык — кружки-узлы + линии-связи, тот же, что у иконок
 * layoutLR/layoutTB/layoutRadial.
 */

let uid = 0;
function nextKey(): string {
  uid += 1;
  return `k${uid}`;
}

function dot(cx: number, cy: number, root = false): React.JSX.Element {
  return (
    <circle
      key={nextKey()}
      cx={cx}
      cy={cy}
      r={root ? 8 : 6}
      className={root ? styles.pvNodeRoot : styles.pvNode}
    />
  );
}

function bubbleDot(cx: number, cy: number, r: number): React.JSX.Element {
  return <circle key={nextKey()} cx={cx} cy={cy} r={r} className={styles.pvNode} />;
}

function edge(x1: number, y1: number, x2: number, y2: number, dashed = false): React.JSX.Element {
  return (
    <line
      key={nextKey()}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={dashed ? styles.pvEdgeDashed : styles.pvEdge}
    />
  );
}

function svg(children: React.JSX.Element[]): React.JSX.Element {
  return (
    <svg viewBox="0 0 120 84" className={styles.pvSvg} aria-hidden="true">
      {children}
    </svg>
  );
}

function hierarchyPreview(): React.JSX.Element {
  return svg([
    edge(60, 14, 32, 42),
    edge(60, 14, 88, 42),
    edge(32, 42, 18, 70),
    edge(32, 42, 46, 70),
    edge(88, 42, 88, 70),
    dot(60, 14, true),
    dot(32, 42),
    dot(88, 42),
    dot(18, 70),
    dot(46, 70),
    dot(88, 70),
  ]);
}

function rightPreview(): React.JSX.Element {
  return svg([
    edge(14, 42, 52, 20),
    edge(14, 42, 52, 64),
    edge(52, 20, 96, 14),
    edge(52, 20, 96, 28),
    edge(52, 64, 96, 64),
    dot(14, 42, true),
    dot(52, 20),
    dot(52, 64),
    dot(96, 14),
    dot(96, 28),
    dot(96, 64),
  ]);
}

function leftPreview(): React.JSX.Element {
  return svg([
    edge(106, 42, 68, 20),
    edge(106, 42, 68, 64),
    edge(68, 20, 24, 14),
    edge(68, 20, 24, 28),
    edge(68, 64, 24, 64),
    dot(106, 42, true),
    dot(68, 20),
    dot(68, 64),
    dot(24, 14),
    dot(24, 28),
    dot(24, 64),
  ]);
}

function bothPreview(): React.JSX.Element {
  return svg([
    edge(60, 42, 96, 22),
    edge(60, 42, 96, 62),
    edge(60, 42, 24, 22),
    edge(60, 42, 24, 62),
    dot(60, 42, true),
    dot(96, 22),
    dot(96, 62),
    dot(24, 22),
    dot(24, 62),
  ]);
}

function treePreview(): React.JSX.Element {
  return svg([
    edge(60, 42, 60, 20),
    edge(60, 42, 82, 42),
    edge(60, 42, 60, 64),
    edge(60, 42, 38, 42),
    edge(60, 20, 47, 6),
    edge(60, 20, 73, 6),
    dot(60, 42, true),
    dot(60, 20),
    dot(82, 42),
    dot(60, 64),
    dot(38, 42),
    dot(47, 6),
    dot(73, 6),
  ]);
}

function orgPreview(): React.JSX.Element {
  return svg([
    edge(60, 14, 60, 40),
    edge(24, 40, 96, 40),
    edge(24, 40, 24, 64),
    edge(60, 40, 60, 64),
    edge(96, 40, 96, 64),
    dot(60, 14, true),
    dot(24, 64),
    dot(60, 64),
    dot(96, 64),
  ]);
}

function logicPreview(): React.JSX.Element {
  return svg([
    edge(12, 42, 40, 42),
    edge(40, 16, 40, 70),
    edge(40, 16, 56, 16),
    edge(40, 34, 56, 34),
    edge(40, 52, 56, 52),
    edge(40, 70, 56, 70),
    dot(12, 42, true),
    dot(56, 16),
    dot(56, 34),
    dot(56, 52),
    dot(56, 70),
  ]);
}

function fishbonePreview(): React.JSX.Element {
  return svg([
    edge(18, 42, 96, 42),
    edge(78, 42, 56, 18),
    edge(50, 42, 28, 66),
    dot(102, 42, true),
    dot(56, 18),
    dot(28, 66),
  ]);
}

function timelinePreview(): React.JSX.Element {
  return svg([
    edge(18, 50, 100, 50),
    edge(60, 14, 20, 50),
    edge(60, 14, 46, 50),
    edge(60, 14, 72, 50),
    edge(60, 14, 98, 50),
    dot(60, 14, true),
    dot(20, 50),
    dot(46, 50),
    dot(72, 50),
    dot(98, 50),
  ]);
}

function bubblePreview(): React.JSX.Element {
  return svg([
    edge(60, 42, 60, 12),
    edge(60, 42, 88.5, 32.7),
    edge(60, 42, 77.6, 66.3),
    edge(60, 42, 42.4, 66.3),
    edge(60, 42, 31.5, 32.7),
    dot(60, 42, true),
    bubbleDot(60, 12, 5),
    bubbleDot(88.5, 32.7, 7),
    bubbleDot(77.6, 66.3, 6),
    bubbleDot(42.4, 66.3, 8),
    bubbleDot(31.5, 32.7, 5.5),
  ]);
}

function networkPreview(): React.JSX.Element {
  return svg([
    edge(20, 20, 60, 14),
    edge(60, 14, 100, 26),
    edge(100, 26, 94, 64),
    edge(94, 64, 50, 70),
    edge(50, 70, 16, 58),
    edge(16, 58, 20, 20),
    edge(20, 20, 94, 64),
    edge(60, 14, 50, 70),
    dot(20, 20),
    dot(60, 14),
    dot(100, 26),
    dot(94, 64),
    dot(50, 70),
    dot(16, 58),
  ]);
}

function freePreview(): React.JSX.Element {
  return svg([
    <rect
      key={nextKey()}
      x={6}
      y={6}
      width={108}
      height={72}
      rx={8}
      className={styles.pvDashRect}
    />,
    dot(22, 20),
    dot(90, 16),
    dot(60, 46),
    dot(20, 66),
    dot(96, 68),
  ]);
}

export const LAYOUT_PREVIEWS: Record<LayoutKind, React.JSX.Element> = {
  hierarchy: hierarchyPreview(),
  right: rightPreview(),
  left: leftPreview(),
  both: bothPreview(),
  tree: treePreview(),
  org: orgPreview(),
  logic: logicPreview(),
  fishbone: fishbonePreview(),
  timeline: timelinePreview(),
  bubble: bubblePreview(),
  network: networkPreview(),
  free: freePreview(),
};
