import { memo, useCallback, useEffect, type CSSProperties } from 'react';
import { useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import { NodeHandles } from './NodeHandles';
import { NodeEditor } from './NodeEditor';
import { MindNodeToolbar } from './NodeToolbar';
import { useNodeEditing } from '../hooks/useNodeEditing';
import { DEFAULT_NODE_STYLE, type BorderPattern, type MindNodeData, type NodeShape } from '../types';
import { isDefaultChildLabel } from '../../../shared/i18n';
import { useUIStore } from '../../../store/uiStore';
import styles from './MindNode.module.css';

const shapeClass: Record<NodeShape, string> = {
  rect: styles.shapeRect,
  rounded: styles.shapeRounded,
  ellipse: styles.shapeEllipse,
  diamond: styles.shapeDiamond,
};

/**
 * Build the inline style for the visual box from the node's style override.
 * Each field falls back: explicit `style.*` → legacy `data.color/textColor` →
 * CSS default (left undefined so the stylesheet/theme var applies). Only fields
 * the user actually set produce inline values, so unstyled nodes stay theme-driven.
 */
function boxStyleFrom(data: MindNodeData, shape: NodeShape): CSSProperties {
  const s = data.style;
  const pattern = s?.borderPattern;
  // Ромб рисует контур отдельным SVG (см. DiamondOutline) — clip-path обрезал бы
  // CSS-границу до одних углов. Поэтому border на .box для ромба не задаём.
  const border = shape === 'diamond'
    ? {}
    : {
        borderColor: s?.borderColor ?? undefined,
        borderWidth: s?.borderWidth != null ? `${s.borderWidth}px` : undefined,
        borderStyle: pattern ? (pattern === 'none' ? 'none' : pattern) : undefined,
      };
  return {
    backgroundColor: s?.backgroundColor ?? data.color ?? undefined,
    color: s?.textColor ?? data.textColor ?? undefined,
    ...border,
    fontSize: s?.fontSize != null ? `${s.fontSize}px` : undefined,
    // Кавычки — имена системных шрифтов содержат пробелы ("Segoe UI")
    fontFamily: s?.fontFamily ? `"${s.fontFamily}"` : undefined,
  };
}

/** Штрих-паттерн границы → SVG stroke-dasharray (px, non-scaling-stroke). */
const DASH_ARRAY: Record<BorderPattern, string | undefined> = {
  solid: undefined,
  dashed: '6 4',
  dotted: '1.5 4',
  none: undefined,
};

/**
 * Контур ромба поверх .box: SVG-обводка повторяет форму clip-path (обычная
 * CSS-граница обрезалась бы до углов). Заливку/backdrop даёт сам .box.
 * Полигон совпадает с гранью clip-path; stroke центрирован, non-scaling —
 * толщина в px независимо от размера узла.
 */
function DiamondOutline({ style }: { style: MindNodeData['style'] }): React.JSX.Element {
  const pattern = style?.borderPattern ?? DEFAULT_NODE_STYLE.borderPattern;
  return (
    <svg className={styles.diamondOutline} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <polygon
        points="50,0 100,50 50,100 0,50"
        fill="none"
        stroke={pattern === 'none' ? 'none' : (style?.borderColor ?? DEFAULT_NODE_STYLE.borderColor)}
        strokeWidth={style?.borderWidth ?? DEFAULT_NODE_STYLE.borderWidth}
        strokeDasharray={DASH_ARRAY[pattern]}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MindNodeComponent({
  id,
  data,
  selected,
}: NodeProps): React.JSX.Element {
  const isRoot = Boolean(data.isRoot);
  const nodeData = data as unknown as MindNodeData;
  // Подсветка будущего родителя во время drag (XMind-модель) — и для reparent
  // (курсор над этим узлом), и для reorder (курсор рядом, в его группе сиблингов).
  const isDropTarget = useUIStore((s) => s.dragIndicator?.parentId === id);

  // Смещение хэндлов меняет их DOM-позиции — просим RF перемерить узел,
  // иначе рёбра продолжат целиться в старые точки до первого drag.
  const updateNodeInternals = useUpdateNodeInternals();
  const handleOffsets = nodeData.handleOffsets;
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, handleOffsets, updateNodeInternals]);

  const {
    isEditing,
    draft,
    textareaRef,
    startEditing,
    onChange,
    commit,
    onKeyDown,
  } = useNodeEditing({ nodeId: id, initialLabel: nodeData.label });

  // Двойной клик → вход в редактирование
  const handleDoubleClick = useCallback(() => {
    startEditing();
  }, [startEditing]);

  const showToolbar = Boolean(selected) && !isEditing;
  const isPlaceholderLabel = !isEditing && isDefaultChildLabel(nodeData.label);
  const shape: NodeShape = nodeData.style?.shape ?? DEFAULT_NODE_STYLE.shape;

  return (
    <div
      className={clsx(
        styles.node,
        isRoot && styles.root,
        selected && styles.selected,
        isDropTarget && styles.dropTarget,
      )}
      onDoubleClick={handleDoubleClick}
    >
      <MindNodeToolbar nodeId={id} isRoot={isRoot} isVisible={showToolbar} />
      <NodeHandles offsets={handleOffsets} />
      <div
        className={clsx(
          styles.box,
          shapeClass[shape],
          isEditing && styles.editing,
          isPlaceholderLabel && styles.placeholder,
        )}
        style={boxStyleFrom(nodeData, shape)}
      >
        <div className={styles.content}>
          {isEditing ? (
            <NodeEditor
              value={draft}
              textareaRef={textareaRef}
              onChange={onChange}
              onBlur={commit}
              onKeyDown={onKeyDown}
            />
          ) : (
            <span className={styles.label}>{nodeData.label}</span>
          )}
        </div>
      </div>
      {shape === 'diamond' && <DiamondOutline style={nodeData.style} />}
    </div>
  );
}

export const MindNode = memo(MindNodeComponent);
