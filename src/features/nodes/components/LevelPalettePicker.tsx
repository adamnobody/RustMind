import clsx from 'clsx';
import { Icon } from '../../../shared/ui/Icon/Icon';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useT, type TranslationKey } from '../../../shared/i18n';
import { NODE_COLORS } from '../../../shared/lib/constants';
import { treeDepth } from '../../layout/strategies/shared';
import {
  LEVEL_PALETTES,
  matchingPaletteId,
  paletteFromSeed,
  levelColorAt,
  normalizeHex,
  type LevelPalette,
  type LevelPaletteId,
} from '../levelPalettes';
import styles from './LevelPalettePicker.module.css';

function paletteLabelKey(id: string): TranslationKey {
  return `palette.${id}` as TranslationKey;
}

function paint(palette: Pick<LevelPalette, 'root' | 'levels'> | null, seedNodeId?: string): void {
  const store = useMindMapStore.getState();
  const root = store.getRootNode();
  if (!palette) {
    store.setProjectSettings({ levelColors: undefined });
    if (root) {
      store.updateNodeData(root.id, { color: NODE_COLORS.root });
      if (root.data.style?.backgroundColor) {
        store.setNodeStyle(root.id, { backgroundColor: undefined });
      }
    }
    return;
  }
  store.setProjectSettings({ levelColors: [...palette.levels] });
  if (root) {
    store.updateNodeData(root.id, { color: palette.root });
    if (root.data.style?.backgroundColor) {
      store.setNodeStyle(root.id, { backgroundColor: undefined });
    }
  }
  if (seedNodeId && seedNodeId !== root?.id) {
    const node = store.nodes.find((n) => n.id === seedNodeId);
    if (node?.data.style?.backgroundColor) {
      store.setNodeStyle(seedNodeId, { backgroundColor: undefined });
    }
  }
}

interface LevelPalettePickerProps {
  /** Узел, чей цвет — якорь своей палитры. Без id — корень (настройки). */
  nodeId?: string;
}

export function LevelPalettePicker({ nodeId }: LevelPalettePickerProps): React.JSX.Element {
  const t = useT();
  const levelColors = useMindMapStore((s) => s.projectSettings.levelColors);
  const rootColor = useMindMapStore((s) => s.nodes.find((n) => n.data.isRoot)?.data.color);
  const node = useMindMapStore((s) => {
    if (nodeId) return s.nodes.find((n) => n.id === nodeId);
    return s.nodes.find((n) => n.data.isRoot);
  });
  const edges = useMindMapStore((s) => s.edges);

  const depth = node ? (node.data.isRoot ? 0 : treeDepth(node.id, edges)) : 0;
  const fromPalette = depth === 0 ? rootColor : levelColorAt(levelColors, depth);
  const seed =
    normalizeHex(node?.data.style?.backgroundColor ?? node?.data.color ?? fromPalette ?? NODE_COLORS.root) ??
    NODE_COLORS.root;
  const generated = paletteFromSeed(seed, depth);
  const active = matchingPaletteId(rootColor, levelColors);
  const noneOn = !levelColors?.some((c) => c);
  const customOn = !noneOn && !active;
  const preview = generated ? [generated.root, ...generated.levels] : [];
  const seedIdx = Math.max(0, Math.min(preview.length - 1, depth));

  return (
    <div className={styles.field}>
      <span className={styles.label}>{t('palette.title')}</span>
      <div className={styles.list} role="radiogroup" aria-label={t('palette.title')}>
        <button
          type="button"
          role="radio"
          aria-checked={noneOn}
          className={clsx(styles.row, noneOn && styles.rowActive)}
          onClick={() => paint(null)}
        >
          <span className={styles.dots} aria-hidden="true">
            <span className={styles.dotNone} />
          </span>
          <span className={styles.name}>{t('palette.none')}</span>
        </button>

        <div className={clsx(styles.row, styles.rowCustom, customOn && styles.rowActive)}>
          <button
            type="button"
            role="radio"
            aria-checked={customOn}
            className={styles.rowHit}
            onClick={() => generated && paint(generated, node?.id)}
          >
            <span className={styles.dots} aria-hidden="true">
              {preview.map((c, i) => (
                  <span
                    key={i}
                    className={clsx(styles.dot, i === seedIdx && styles.dotAnchor)}
                    style={{ background: c }}
                  />
                ))}
            </span>
            <span className={styles.name}>{t('palette.custom')}</span>
          </button>
          <label className={styles.pick} title={t('palette.customHint')}>
            <Icon name="plus" size={12} />
            <input
              type="color"
              className={styles.pickInput}
              value={seed}
              aria-label={t('palette.customHint')}
              onChange={(e) => {
                const next = paletteFromSeed(e.target.value, depth);
                if (next) paint(next, node?.id);
              }}
            />
          </label>
        </div>

        {LEVEL_PALETTES.map((p) => {
          const selected = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={clsx(styles.row, selected && styles.rowActive)}
              onClick={() => paint(p, node?.id)}
            >
              <span className={styles.dots} aria-hidden="true">
                {[p.root, ...p.levels].map((c) => (
                  <span key={c} className={styles.dot} style={{ background: c }} />
                ))}
              </span>
              <span className={styles.name}>{t(paletteLabelKey(p.id as LevelPaletteId))}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
