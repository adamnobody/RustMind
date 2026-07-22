import { useCallback } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useT } from '../../../shared/i18n';
import {
  DEFAULT_EDGE_STYLE,
  type MindEdgeData,
  type EdgeArrowType,
  type EdgeLinePattern,
} from '../../edges/types';
import type { EdgeRoutingChoice } from '../../edges/lib/routing';
import type { TranslationKey } from '../../../shared/i18n/translations';
import { Switch } from '../../../shared/ui/Switch/Switch';
import { ColorField, NumberField, SegField, TextField } from './fields';
import styles from './Inspector.module.css';

/**
 * Мини-схема варианта геометрии: тот же путь в координатах 28×16, что рисует
 * соответствующий маршрут на канвасе — вариант узнаётся глазом, а не по тексту.
 */
function RoutingGlyph({ d, dashed }: { d: string; dashed?: boolean }): React.JSX.Element {
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

const routingOptions: {
  value: EdgeRoutingChoice;
  glyph: React.JSX.Element;
  labelKey: TranslationKey;
}[] = [
  // auto — та же кривая, но пунктиром: «форму выбирает раскладка».
  { value: 'auto', glyph: <RoutingGlyph d="M 2 13 C 10 13, 18 3, 26 3" dashed />, labelKey: 'edge.routing.auto' },
  { value: 'straight', glyph: <RoutingGlyph d="M 2 13 L 26 3" />, labelKey: 'edge.routing.straight' },
  { value: 'bezier', glyph: <RoutingGlyph d="M 2 13 C 10 13, 18 3, 26 3" />, labelKey: 'edge.routing.bezier' },
  {
    value: 'smoothstep',
    glyph: <RoutingGlyph d="M 2 13 L 10 13 Q 14 13, 14 9 L 14 7 Q 14 3, 18 3 L 26 3" />,
    labelKey: 'edge.routing.smoothstep',
  },
  {
    value: 'orthogonal',
    glyph: <RoutingGlyph d="M 2 13 L 8 13 L 8 8 L 20 8 L 20 3 L 26 3" />,
    labelKey: 'edge.routing.orthogonal',
  },
  { value: 'step', glyph: <RoutingGlyph d="M 2 13 L 14 13 L 14 3 L 26 3" />, labelKey: 'edge.routing.step' },
];

const patternOptions: { value: EdgeLinePattern; label: string }[] = [
  { value: 'solid', label: '——' },
  { value: 'dashed', label: '- -' },
  { value: 'dotted', label: '···' },
];

const startArrowOptions: { value: EdgeArrowType; label: string }[] = [
  { value: 'none', label: '—' },
  { value: 'open', label: '◁' },
  { value: 'filled', label: '◀' },
  { value: 'dot', label: '●' },
  { value: 'diamond', label: '◆' },
];

const endArrowOptions: { value: EdgeArrowType; label: string }[] = [
  { value: 'none', label: '—' },
  { value: 'open', label: '▷' },
  { value: 'filled', label: '▶' },
  { value: 'dot', label: '●' },
  { value: 'diamond', label: '◆' },
];

// Стартовые значения нативного color-input, когда переопределения ещё нет
// (дефолты — CSS-переменные темы, которые input показать не может).
const COLOR_SEED = {
  edge: '#66758d',
  text: '#e2e8f0',
} as const;

interface EdgeStyleEditorProps {
  edgeId: string;
  data: MindEdgeData | undefined;
}

export function EdgeStyleEditor({ edgeId, data }: EdgeStyleEditorProps): React.JSX.Element {
  const t = useT();
  const setEdgeStyle = useMindMapStore((s) => s.setEdgeStyle);
  const style = data?.style;

  const set = useCallback(
    (patch: Parameters<typeof setEdgeStyle>[1]) => setEdgeStyle(edgeId, patch),
    [setEdgeStyle, edgeId],
  );

  const label = style?.label ?? '';

  return (
    <div className={styles.editor}>
      <TextField
        label={t('edge.labelText')}
        value={label}
        placeholder={t('edge.labelPlaceholder')}
        // Пустая строка = «подписи нет» — поле удаляется из style, а не хранится пустым.
        onChange={(v) => set({ label: v === '' ? undefined : v })}
      />

      {label !== '' && (
        <>
          <NumberField
            label={t('edge.textSize')}
            value={style?.labelFontSize ?? DEFAULT_EDGE_STYLE.labelFontSize}
            min={9}
            max={24}
            suffix="px"
            onChange={(labelFontSize) => set({ labelFontSize })}
          />
          <ColorField
            label={t('edge.textColor')}
            value={style?.labelColor}
            fallback={COLOR_SEED.text}
            onChange={(hex) => set({ labelColor: hex })}
            onReset={() => set({ labelColor: undefined })}
          />
        </>
      )}

      {/* Геометрия пути — не путать с паттерном штриха ниже. */}
      <SegField
        label={t('edge.routing')}
        value={style?.routing ?? DEFAULT_EDGE_STYLE.routing}
        columns={3}
        options={routingOptions.map((o) => ({
          value: o.value,
          label: o.glyph,
          title: t(o.labelKey),
        }))}
        onChange={(routing) => set({ routing })}
      />

      <SegField
        label={t('edge.line')}
        value={style?.linePattern ?? DEFAULT_EDGE_STYLE.linePattern}
        options={patternOptions}
        onChange={(linePattern) => set({ linePattern })}
      />

      <NumberField
        label={t('edge.thickness')}
        value={style?.strokeWidth ?? DEFAULT_EDGE_STYLE.strokeWidth}
        min={1}
        max={8}
        suffix="px"
        onChange={(strokeWidth) => set({ strokeWidth })}
      />

      <ColorField
        label={t('edge.lineColor')}
        value={style?.strokeColor}
        fallback={COLOR_SEED.edge}
        onChange={(hex) => set({ strokeColor: hex })}
        onReset={() => set({ strokeColor: undefined })}
      />

      <SegField
        label={t('edge.startArrow')}
        value={style?.sourceArrow ?? DEFAULT_EDGE_STYLE.sourceArrow}
        options={startArrowOptions}
        onChange={(sourceArrow) => set({ sourceArrow })}
      />

      <SegField
        label={t('edge.endArrow')}
        value={style?.targetArrow ?? DEFAULT_EDGE_STYLE.targetArrow}
        options={endArrowOptions}
        onChange={(targetArrow) => set({ targetArrow })}
      />

      <Switch
        label={t('edge.taper')}
        checked={style?.taper ?? DEFAULT_EDGE_STYLE.taper}
        onCheckedChange={(taper) => set({ taper })}
      />
    </div>
  );
}
