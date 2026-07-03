import { useCallback } from 'react';
import { useMindMapStore } from '../../../store/mindMapStore';
import {
  DEFAULT_NODE_STYLE,
  DEFAULT_HANDLE_OFFSET,
  type MindNodeData,
  type NodeShape,
  type BorderPattern,
  type HandleSide,
} from '../../nodes/types';
import { ColorField, NumberField, SegField } from './fields';
import styles from './Inspector.module.css';

const handleSides: { side: HandleSide; label: string }[] = [
  { side: 'top', label: 'Верхняя точка' },
  { side: 'right', label: 'Правая точка' },
  { side: 'bottom', label: 'Нижняя точка' },
  { side: 'left', label: 'Левая точка' },
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
  const setNodeStyle = useMindMapStore((s) => s.setNodeStyle);
  const setNodeHandleOffset = useMindMapStore((s) => s.setNodeHandleOffset);
  const style = data.style;

  // One setter to rule them all — passing the default value back prunes the field
  // (see setNodeStyle), so "reset to default" is just "set to default".
  const set = useCallback(
    (patch: Parameters<typeof setNodeStyle>[1]) => setNodeStyle(nodeId, patch),
    [setNodeStyle, nodeId],
  );

  return (
    <div className={styles.editor}>
      <ColorField
        label="Цвет фона"
        value={style?.backgroundColor}
        fallback={data.color ?? COLOR_SEED.background}
        onChange={(hex) => set({ backgroundColor: hex })}
        onReset={() => set({ backgroundColor: undefined })}
      />

      <SegField
        label="Форма"
        value={style?.shape ?? DEFAULT_NODE_STYLE.shape}
        options={shapeOptions}
        onChange={(shape) => set({ shape })}
      />

      <ColorField
        label="Цвет границы"
        value={style?.borderColor}
        fallback={COLOR_SEED.border}
        onChange={(hex) => set({ borderColor: hex })}
        onReset={() => set({ borderColor: undefined })}
      />

      <NumberField
        label="Толщина границы"
        value={style?.borderWidth ?? DEFAULT_NODE_STYLE.borderWidth}
        min={0}
        max={8}
        suffix="px"
        onChange={(borderWidth) => set({ borderWidth })}
      />

      <SegField
        label="Стиль границы"
        value={style?.borderPattern ?? DEFAULT_NODE_STYLE.borderPattern}
        options={borderOptions}
        onChange={(borderPattern) => set({ borderPattern })}
      />

      <NumberField
        label="Размер шрифта"
        value={style?.fontSize ?? DEFAULT_NODE_STYLE.fontSize}
        min={10}
        max={40}
        suffix="px"
        onChange={(fontSize) => set({ fontSize })}
      />

      <ColorField
        label="Цвет текста"
        value={style?.textColor}
        fallback={data.textColor ?? COLOR_SEED.text}
        onChange={(hex) => set({ textColor: hex })}
        onReset={() => set({ textColor: undefined })}
      />

      {/* Смещение хэндлов вдоль своей стороны: 0% — левый/верхний угол,
          50% — центр (дефолт, не хранится), 100% — правый/нижний угол. */}
      <h3 className={styles.subheading}>Точки соединения</h3>
      {handleSides.map(({ side, label }) => (
        <NumberField
          key={side}
          label={label}
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
