import type { LayoutKind } from '../engines/layoutTypes';
import styles from './LayoutTypeDialog.module.css';

/**
 * Мини-схемы для диалога выбора типа карты: ASCII-арт скелет для каждого
 * типа, в духе терминального дизайна главного меню (см. AsciiBackdrop).
 * Корневой узел — акцентная «O», остальные — приглушённые «o».
 */

let uid = 0;
function nextKey(): string {
  uid += 1;
  return `k${uid}`;
}

function root(): React.JSX.Element {
  return (
    <span key={nextKey()} className={styles.asciiRoot}>
      O
    </span>
  );
}

type Line = (string | React.JSX.Element)[];

function art(lines: Line[]): React.JSX.Element {
  const children = lines.flatMap((line, i) => (i > 0 ? ['\n', ...line] : line));
  return <pre className={styles.asciiArt}>{children}</pre>;
}

const PREVIEW_LINES: Record<LayoutKind, Line[]> = {
  hierarchy: [
    ['      ', root()],
    ['    / | \\'],
    ['   o   o   o'],
    ['  /|       |\\'],
    [' o o       o o'],
  ],
  right: [
    ['          o--o'],
    ['         /'],
    [root(), '---o---o'],
    ['         \\'],
    ['          o--o'],
  ],
  left: [['o--o'], ['     \\'], ['      o---o---', root()], ['     /'], ['o--o']],
  both: [
    ['o         o'],
    [' \\       /'],
    ['  o--- ', root(), ' ---o'],
    [' /       \\'],
    ['o         o'],
  ],
  tree: [
    [' o    |    o'],
    ['   \\  |  /'],
    ['o----', root(), '----o'],
    ['   /  |  \\'],
    [' o    |    o'],
  ],
  org: [
    ['        ', root()],
    ['        |'],
    ['   +----+----+'],
    ['   |    |    |'],
    ['   o    o    o'],
  ],
  logic: [[root(), '--+--o'], ['   |'], ['   +--o'], ['   |'], ['   +--o']],
  fishbone: [
    [' \\    \\    \\'],
    ['  \\    \\    \\'],
    ['o------------', root()],
    ['  /    /    /'],
    [' /    /    /'],
  ],
  timeline: [['      ', root()], ['      |'], ['o--o--o--o--o']],
  bubble: [
    [' (o)        (o)'],
    [''],
    ['      ((', root(), '))'],
    [''],
    [' (o)        (o)'],
  ],
  network: [['o---o'], [' \\ / \\'], ['  x    o'], [' / \\  /'], ['o---o']],
  free: [['   o        o'], [''], ['        o'], [''], ['   o        o']],
};

export const LAYOUT_PREVIEWS: Record<LayoutKind, React.JSX.Element> = Object.fromEntries(
  Object.entries(PREVIEW_LINES).map(([kind, lines]) => [kind, art(lines)]),
) as Record<LayoutKind, React.JSX.Element>;
