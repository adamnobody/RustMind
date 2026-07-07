import { memo, useCallback, useEffect, type CSSProperties } from 'react';
import { useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import { NodeHandles } from './NodeHandles';
import { NodeEditor } from './NodeEditor';
import { MindNodeToolbar } from './NodeToolbar';
import { useNodeEditing } from '../hooks/useNodeEditing';
import { DEFAULT_NODE_STYLE, type MindNodeData, type NodeShape } from '../types';
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
function boxStyleFrom(data: MindNodeData): CSSProperties {
  const s = data.style;
  const pattern = s?.borderPattern;
  return {
    backgroundColor: s?.backgroundColor ?? data.color ?? undefined,
    color: s?.textColor ?? data.textColor ?? undefined,
    borderColor: s?.borderColor ?? undefined,
    borderWidth: s?.borderWidth != null ? `${s.borderWidth}px` : undefined,
    borderStyle: pattern ? (pattern === 'none' ? 'none' : pattern) : undefined,
    fontSize: s?.fontSize != null ? `${s.fontSize}px` : undefined,
    // Кавычки — имена системных шрифтов содержат пробелы ("Segoe UI")
    fontFamily: s?.fontFamily ? `"${s.fontFamily}"` : undefined,
  };
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
        style={boxStyleFrom(nodeData)}
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
    </div>
  );
}

export const MindNode = memo(MindNodeComponent);
