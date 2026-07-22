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
import { ColorField, NumberField, SegField, TextField, ToggleField } from './fields';
import { ArrowGlyph, LinePatternGlyph, RoutingGlyph } from './glyphs';

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

const patternOptions: { value: EdgeLinePattern; labelKey: TranslationKey }[] = [
  { value: 'solid', labelKey: 'line.solid' },
  { value: 'dashed', labelKey: 'line.dashed' },
  { value: 'dotted', labelKey: 'line.dotted' },
];

const arrowOptions: { value: EdgeArrowType; labelKey: TranslationKey }[] = [
  { value: 'none', labelKey: 'arrow.none' },
  { value: 'open', labelKey: 'arrow.open' },
  { value: 'filled', labelKey: 'arrow.filled' },
  { value: 'dot', labelKey: 'arrow.dot' },
  { value: 'diamond', labelKey: 'arrow.diamond' },
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
    <>
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

      <ColorField
        label={t('edge.lineColor')}
        value={style?.strokeColor}
        fallback={COLOR_SEED.edge}
        onChange={(hex) => set({ strokeColor: hex })}
        onReset={() => set({ strokeColor: undefined })}
      />

      <NumberField
        label={t('edge.thickness')}
        value={style?.strokeWidth ?? DEFAULT_EDGE_STYLE.strokeWidth}
        min={1}
        max={8}
        suffix="px"
        onChange={(strokeWidth) => set({ strokeWidth })}
      />

      <SegField
        label={t('edge.line')}
        value={style?.linePattern ?? DEFAULT_EDGE_STYLE.linePattern}
        options={patternOptions.map((o) => ({
          value: o.value,
          label: <LinePatternGlyph pattern={o.value} />,
          title: t(o.labelKey),
        }))}
        onChange={(linePattern) => set({ linePattern })}
      />

      <SegField
        label={t('edge.startArrow')}
        value={style?.sourceArrow ?? DEFAULT_EDGE_STYLE.sourceArrow}
        options={arrowOptions.map((o) => ({
          value: o.value,
          label: <ArrowGlyph arrow={o.value} direction="start" />,
          title: t(o.labelKey),
        }))}
        onChange={(sourceArrow) => set({ sourceArrow })}
      />

      <SegField
        label={t('edge.endArrow')}
        value={style?.targetArrow ?? DEFAULT_EDGE_STYLE.targetArrow}
        options={arrowOptions.map((o) => ({
          value: o.value,
          label: <ArrowGlyph arrow={o.value} direction="end" />,
          title: t(o.labelKey),
        }))}
        onChange={(targetArrow) => set({ targetArrow })}
      />

      <ToggleField
        label={t('edge.taper')}
        checked={style?.taper ?? DEFAULT_EDGE_STYLE.taper}
        onChange={(taper) => set({ taper })}
      />

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
    </>
  );
}
