import { useCallback } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import {
  DEFAULT_EDGE_STYLE,
  type MindEdgeData,
  type EdgeArrowType,
  type EdgeLinePattern,
} from '../../edges/types';
import { ColorField, NumberField, SegField, TextField } from './fields';
import styles from './Inspector.module.css';

const patternOptions: { value: EdgeLinePattern; label: string }[] = [
  { value: 'solid', label: '——' },
  { value: 'dashed', label: '- -' },
  { value: 'dotted', label: '···' },
];

const startArrowOptions: { value: EdgeArrowType; label: string }[] = [
  { value: 'none', label: '—' },
  { value: 'open', label: '◁' },
  { value: 'filled', label: '◀' },
];

const endArrowOptions: { value: EdgeArrowType; label: string }[] = [
  { value: 'none', label: '—' },
  { value: 'open', label: '▷' },
  { value: 'filled', label: '▶' },
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
        label="Текст на связи"
        value={label}
        placeholder="Подпись…"
        // Пустая строка = «подписи нет» — поле удаляется из style, а не хранится пустым.
        onChange={(v) => set({ label: v === '' ? undefined : v })}
      />

      {label !== '' && (
        <>
          <NumberField
            label="Размер текста"
            value={style?.labelFontSize ?? DEFAULT_EDGE_STYLE.labelFontSize}
            min={9}
            max={24}
            suffix="px"
            onChange={(labelFontSize) => set({ labelFontSize })}
          />
          <ColorField
            label="Цвет текста"
            value={style?.labelColor}
            fallback={COLOR_SEED.text}
            onChange={(hex) => set({ labelColor: hex })}
            onReset={() => set({ labelColor: undefined })}
          />
        </>
      )}

      <SegField
        label="Линия"
        value={style?.linePattern ?? DEFAULT_EDGE_STYLE.linePattern}
        options={patternOptions}
        onChange={(linePattern) => set({ linePattern })}
      />

      <NumberField
        label="Толщина"
        value={style?.strokeWidth ?? DEFAULT_EDGE_STYLE.strokeWidth}
        min={1}
        max={8}
        suffix="px"
        onChange={(strokeWidth) => set({ strokeWidth })}
      />

      <ColorField
        label="Цвет линии"
        value={style?.strokeColor}
        fallback={COLOR_SEED.edge}
        onChange={(hex) => set({ strokeColor: hex })}
        onReset={() => set({ strokeColor: undefined })}
      />

      <SegField
        label="Стрелка в начале"
        value={style?.sourceArrow ?? DEFAULT_EDGE_STYLE.sourceArrow}
        options={startArrowOptions}
        onChange={(sourceArrow) => set({ sourceArrow })}
      />

      <SegField
        label="Стрелка в конце"
        value={style?.targetArrow ?? DEFAULT_EDGE_STYLE.targetArrow}
        options={endArrowOptions}
        onChange={(targetArrow) => set({ targetArrow })}
      />
    </div>
  );
}
