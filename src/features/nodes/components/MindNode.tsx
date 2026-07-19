import { memo, useCallback, useEffect, type CSSProperties } from 'react';
import { useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';
import { NodeHandles } from './NodeHandles';
import { NodeEditor } from './NodeEditor';
import { MindNodeToolbar } from './NodeToolbar';
import { NodeNotePanel } from './NodeNotePanel';
import { useNodeEditing } from '../hooks/useNodeEditing';
import { DEFAULT_NODE_STYLE, type BorderPattern, type MindNodeData, type NodeShape } from '../types';
import { isDefaultChildLabel } from '../../../shared/i18n';
import { isTreeEdge } from '../../edges/types';
import { useMindMapStore } from '../../../store/mindMapStore';
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
 * project level colour (transient) → CSS default. Only fields the user actually
 * set produce inline values, so unstyled nodes stay theme-driven.
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
    backgroundColor: s?.backgroundColor ?? data.color ?? data.levelColor ?? undefined,
    color: s?.textColor ?? data.textColor ?? undefined,
    ...border,
    fontSize: s?.fontSize != null ? `${s.fontSize}px` : undefined,
    // Кавычки — имена системных шрифтов содержат пробелы ("Segoe UI")
    fontFamily: s?.fontFamily ? `"${s.fontFamily}"` : undefined,
    fontWeight: s?.bold ? 700 : undefined,
    fontStyle: s?.italic ? 'italic' : undefined,
    textDecoration: s?.underline ? 'underline' : undefined,
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

/**
 * Прогресс по потомкам-задачам этого узла: доля отмеченных листьев среди всех
 * листьев поддерева. ponytail: обход поддерева на каждый узел (O(N) на узел) —
 * приемлемо для десятков–сотен узлов; кэш по id, если карты вырастут.
 */
function subtreeProgress(
  id: string,
  childrenOf: Map<string, string[]>,
  checkedOf: Map<string, boolean>,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  const stack = [...(childrenOf.get(id) ?? [])];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const kids = childrenOf.get(cur) ?? [];
    if (kids.length === 0) {
      total += 1;
      if (checkedOf.get(cur)) done += 1;
    } else {
      stack.push(...kids);
    }
  }
  return { done, total };
}

function MindNodeComponent({
  id,
  data,
  selected,
}: NodeProps): React.JSX.Element {
  const isRoot = Boolean(data.isRoot);
  const nodeData = data as unknown as MindNodeData;
  const isDropTarget = useUIStore((s) => s.dragIndicator?.parentId === id);
  const noteOpen = useUIStore((s) => s.openNoteNodeId === id);
  const toggleNotePanel = useUIStore((s) => s.toggleNotePanel);
  const searchQuery = useUIStore((s) => (s.searchOpen ? s.searchQuery.trim().toLowerCase() : ''));
  const searchMatch = searchQuery !== '' && nodeData.label.toLowerCase().includes(searchQuery);

  const toggleNodeCollapse = useMindMapStore((s) => s.toggleNodeCollapse);
  const toggleNodeChecked = useMindMapStore((s) => s.toggleNodeChecked);

  // Дочерние узлы и прогресс поддёргиваем одним селектором. Возвращаем ТОЛЬКО
  // примитивы (useShallow сравнивает поля через Object.is): объект прогресса
  // создавал бы новую ссылку на каждый вызов и ломал бы мемоизацию.
  const { childCount, progressDone, progressTotal } = useMindMapStore(
    useShallow((s) => {
      const childrenOf = new Map<string, string[]>();
      const checkedOf = new Map<string, boolean>();
      for (const n of s.nodes) checkedOf.set(n.id, Boolean(n.data.checked));
      for (const e of s.edges) {
        if (!isTreeEdge(e)) continue;
        const list = childrenOf.get(e.source);
        if (list) list.push(e.target);
        else childrenOf.set(e.source, [e.target]);
      }
      const count = childrenOf.get(id)?.length ?? 0;
      const p = count > 0 ? subtreeProgress(id, childrenOf, checkedOf) : { done: 0, total: 0 };
      return { childCount: count, progressDone: p.done, progressTotal: p.total };
    }),
  );

  const collapsed = Boolean(nodeData.collapsed);
  const checked = Boolean(nodeData.checked);
  const hasNote = Boolean(nodeData.note && nodeData.note.trim() !== '');

  // Смещение хэндлов меняет их DOM-позиции — просим RF перемерить узел.
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
        searchMatch && styles.searchMatch,
      )}
      onDoubleClick={handleDoubleClick}
    >
      <MindNodeToolbar nodeId={id} isRoot={isRoot} isVisible={showToolbar} hasNote={hasNote} />
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
          {!isRoot && !isEditing && (
            <button
              type="button"
              className={clsx(styles.checkbox, checked && styles.checkboxChecked)}
              aria-pressed={checked}
              aria-label="task"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeChecked(id);
              }}
            >
              {checked ? '✓' : ''}
            </button>
          )}
          {isEditing ? (
            <NodeEditor
              value={draft}
              textareaRef={textareaRef}
              onChange={onChange}
              onBlur={commit}
              onKeyDown={onKeyDown}
            />
          ) : (
            <span className={clsx(styles.label, checked && styles.labelChecked)}>
              {nodeData.label}
            </span>
          )}
          {progressTotal > 0 && progressDone > 0 && (
            <span className={styles.progressBadge}>
              {progressDone}/{progressTotal}
            </span>
          )}
        </div>
      </div>
      {shape === 'diamond' && <DiamondOutline style={nodeData.style} />}
      {hasNote && (
        <button
          type="button"
          className={styles.noteBadge}
          aria-label="note"
          onClick={(e) => {
            e.stopPropagation();
            toggleNotePanel(id);
          }}
        >
          ✎
        </button>
      )}
      {/* ponytail: toggle always sits at the right edge; layouts that grow left
          (left/both) still work, just the affordance isn't mirrored. */}
      {childCount > 0 && (
        <button
          type="button"
          className={clsx(styles.collapseToggle, collapsed && styles.collapseToggleCollapsed)}
          aria-label="collapse"
          onClick={(e) => {
            e.stopPropagation();
            toggleNodeCollapse(id);
          }}
        >
          {collapsed ? childCount : '−'}
        </button>
      )}
      {noteOpen && <NodeNotePanel nodeId={id} note={nodeData.note ?? ''} />}
    </div>
  );
}

export const MindNode = memo(MindNodeComponent);
