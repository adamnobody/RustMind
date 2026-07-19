import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useMindMapStore } from '../../../store/mindMapStore';
import { listSystemFonts, FALLBACK_FONTS } from '../../../shared/lib/fonts';
import { useT, type TranslationKey } from '../../../shared/i18n';
import {
  DEFAULT_NODE_STYLE,
  DEFAULT_HANDLE_OFFSET,
  type MindNodeData,
  type NodeShape,
  type BorderPattern,
  type HandleSide,
} from '../../nodes/types';
import { ColorField, FontField, NumberField, SegField } from './fields';
import styles from './Inspector.module.css';

const handleSides: { side: HandleSide; labelKey: TranslationKey }[] = [
  { side: 'top', labelKey: 'node.handleTop' },
  { side: 'right', labelKey: 'node.handleRight' },
  { side: 'bottom', labelKey: 'node.handleBottom' },
  { side: 'left', labelKey: 'node.handleLeft' },
];

const shapeOptions: { value: NodeShape; label: string }[] = [
  { value: 'rect', label: '▭' },
  { value: 'rounded', label: '▢' },
  { value: 'ellipse', label: '◯' },
  { value: 'diamond', label: '◇' },
];

const borderOptions: { value: BorderPattern; label: string }[] = [
  { value: 'solid', label: '——' },
  { value: 'dashed', label: '- -' },
  { value: 'dotted', label: '···' },
  { value: 'none', label: '∅' },
];

// Picker starting points when a colour has no override yet. Defaults in
// DEFAULT_NODE_STYLE are theme CSS vars (not hex), which a native colour input
// cannot display, so we supply neutral hex seeds here only for the swatch.
const COLOR_SEED = {
  background: '#1e293b',
  border: '#64748b',
  text: '#e2e8f0',
} as const;

interface NodeStyleEditorProps {
  nodeId: string;
  data: MindNodeData;
}

export function NodeStyleEditor({ nodeId, data }: NodeStyleEditorProps): React.JSX.Element {
  const t = useT();
  const setNodeStyle = useMindMapStore((s) => s.setNodeStyle);
  const setNodeHandleOffset = useMindMapStore((s) => s.setNodeHandleOffset);
  const style = data.style;

  // Системные шрифты приходят из Rust асинхронно; до ответа показываем фолбэк,
  // сам listSystemFonts кэширует результат на всё время жизни приложения.
  const [fonts, setFonts] = useState<string[]>([...FALLBACK_FONTS]);
  useEffect(() => {
    let alive = true;
    void listSystemFonts().then((list) => {
      if (alive) setFonts(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  // One setter to rule them all — passing the default value back prunes the field
  // (see setNodeStyle), so "reset to default" is just "set to default".
  const set = useCallback(
    (patch: Parameters<typeof setNodeStyle>[1]) => setNodeStyle(nodeId, patch),
    [setNodeStyle, nodeId],
  );

  return (
    <div className={styles.editor}>
      <ColorField
        label={t('node.bgColor')}
        value={style?.backgroundColor}
        fallback={data.color ?? COLOR_SEED.background}
        onChange={(hex) => set({ backgroundColor: hex })}
        onReset={() => set({ backgroundColor: undefined })}
      />

      <SegField
        label={t('node.shape')}
        value={style?.shape ?? DEFAULT_NODE_STYLE.shape}
        options={shapeOptions}
        onChange={(shape) => set({ shape })}
      />

      <ColorField
        label={t('node.borderColor')}
        value={style?.borderColor}
        fallback={COLOR_SEED.border}
        onChange={(hex) => set({ borderColor: hex })}
        onReset={() => set({ borderColor: undefined })}
      />

      <NumberField
        label={t('node.borderWidth')}
        value={style?.borderWidth ?? DEFAULT_NODE_STYLE.borderWidth}
        min={0}
        max={8}
        suffix="px"
        onChange={(borderWidth) => set({ borderWidth })}
      />

      <SegField
        label={t('node.borderStyle')}
        value={style?.borderPattern ?? DEFAULT_NODE_STYLE.borderPattern}
        options={borderOptions}
        onChange={(borderPattern) => set({ borderPattern })}
      />

      <NumberField
        label={t('node.fontSize')}
        value={style?.fontSize ?? DEFAULT_NODE_STYLE.fontSize}
        min={10}
        max={40}
        suffix="px"
        onChange={(fontSize) => set({ fontSize })}
      />

      <FontField
        label={t('node.font')}
        value={style?.fontFamily}
        fonts={fonts}
        onChange={(fontFamily) => set({ fontFamily })}
      />

      <ColorField
        label={t('node.textColor')}
        value={style?.textColor}
        fallback={data.textColor ?? COLOR_SEED.text}
        onChange={(hex) => set({ textColor: hex })}
        onReset={() => set({ textColor: undefined })}
      />

      {/* Начертание — независимые переключатели (жирный/курсив/подчёркнутый). */}
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('node.textStyle')}</span>
        <div className={styles.segment} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <button
            type="button"
            aria-pressed={Boolean(style?.bold)}
            className={clsx(styles.segmentItem, style?.bold && styles.segmentActive)}
            style={{ fontWeight: 700 }}
            onClick={() => set({ bold: !style?.bold })}
          >
            B
          </button>
          <button
            type="button"
            aria-pressed={Boolean(style?.italic)}
            className={clsx(styles.segmentItem, style?.italic && styles.segmentActive)}
            style={{ fontStyle: 'italic' }}
            onClick={() => set({ italic: !style?.italic })}
          >
            I
          </button>
          <button
            type="button"
            aria-pressed={Boolean(style?.underline)}
            className={clsx(styles.segmentItem, style?.underline && styles.segmentActive)}
            style={{ textDecoration: 'underline' }}
            onClick={() => set({ underline: !style?.underline })}
          >
            U
          </button>
        </div>
      </div>

      {/* Смещение хэндлов вдоль своей стороны: 0% — левый/верхний угол,
          50% — центр (дефолт, не хранится), 100% — правый/нижний угол. */}
      <h3 className={styles.subheading}>{t('node.connectionPoints')}</h3>
      {handleSides.map(({ side, labelKey }) => (
        <NumberField
          key={side}
          label={t(labelKey)}
          value={data.handleOffsets?.[side] ?? DEFAULT_HANDLE_OFFSET}
          min={0}
          max={100}
          suffix="%"
          onChange={(value) => setNodeHandleOffset(nodeId, side, value)}
        />
      ))}
    </div>
  );
}
