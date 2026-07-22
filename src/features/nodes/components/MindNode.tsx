import { memo, useCallback, useEffect, type CSSProperties } from 'react';
import {
  useStore,
  useUpdateNodeInternals,
  type InternalNode,
  type NodeProps,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';
import { NodeHandles } from './NodeHandles';
import { NodeEditor } from './NodeEditor';
import { MindNodeToolbar } from './NodeToolbar';
import { NodeNotePanel } from './NodeNotePanel';
import { useNodeEditing } from '../hooks/useNodeEditing';
import {
  DEFAULT_NODE_STYLE,
  findStatus,
  type BorderPattern,
  type MindNodeData,
  type NodeShape,
} from '../types';
import { isDefaultChildLabel } from '../../../shared/i18n';
import { isTreeEdge, oppositeHandle, DEFAULT_TREE_EDGE_HANDLES } from '../../edges/types';
import { sidePort, type EdgeRoutingChoice, type PortSide, type Rect } from '../../edges/lib/routing';
import { resolveEdgeRoute } from '../../edges/lib/resolveRoute';
import { getLayoutStrategy } from '../../layout/strategies/registry';
import type { LayoutStrategy } from '../../layout/strategies/types';
import type { AppNode, AppEdge } from '../../../store/types';
import { DEFAULT_NODE_SIZE, ROOT_NODE_SIZE } from '../../../shared/lib/constants';
import { useMindMapStore } from '../../../store/mindMapStore';
import { useUIStore } from '../../../store/uiStore';
import styles from './MindNode.module.css';

const shapeClass: Record<NodeShape, string> = {
  rect: styles.shapeRect,
  rounded: styles.shapeRounded,
  ellipse: styles.shapeEllipse,
  diamond: styles.shapeDiamond,
};

const COLLAPSE_SIDES: PortSide[] = ['top', 'right', 'bottom', 'left'];
/** На сколько px вынести кнопку сворачивания наружу от грани узла (на линию). */
const COLLAPSE_PERP = 15;

function isPortSide(v: string | null | undefined): v is PortSide {
  return v === 'top' || v === 'right' || v === 'bottom' || v === 'left';
}

/** Значение routing из сериализованной строки; всё неизвестное — 'auto'. */
function toRoutingChoice(v: string | undefined): EdgeRoutingChoice {
  switch (v) {
    case 'straight':
    case 'bezier':
    case 'smoothstep':
    case 'orthogonal':
    case 'step':
      return v;
    default:
      return 'auto';
  }
}

interface EdgeSideArgs {
  strategy: LayoutStrategy;
  geometry: EdgeRoutingChoice;
  sourceId: string;
  targetId: string;
  ownRect: Rect;
  childRect: Rect;
  sourceHandle: string | null | undefined;
  rectOf: (id: string) => Rect | undefined;
  nodes: AppNode[];
  edges: AppEdge[];
}

/**
 * Сторона, с которой ребро реально ВЫХОДИТ из родителя. Не воспроизводим логику
 * повторно — спрашиваем ТОТ ЖЕ resolveEdgeRoute, которым MindEdge рисует линию
 * (включая семантические маршруты раскладок и пользовательский override),
 * иначе кнопка сворачивания встаёт не на ту грань, где линия.
 */
function edgeSourceSide(args: EdgeSideArgs): PortSide {
  const handleSide = isPortSide(args.sourceHandle)
    ? args.sourceHandle
    : DEFAULT_TREE_EDGE_HANDLES.sourceHandle;
  const opposite = oppositeHandle(handleSide);
  return resolveEdgeRoute({
    geometry: args.geometry,
    isTree: true,
    strategy: args.strategy,
    ctx: {
      sourceId: args.sourceId,
      targetId: args.targetId,
      sourceRect: args.ownRect,
      targetRect: args.childRect,
      rectOf: args.rectOf,
      nodes: args.nodes,
      edges: args.edges,
    },
    handles: {
      source: sidePort(args.ownRect, handleSide),
      target: sidePort(args.childRect, isPortSide(opposite) ? opposite : 'left'),
    },
  }).source.side;
}

/**
 * Инлайновый стиль кнопки сворачивания: одна кнопка НА СТОРОНУ (у хэндла), в
 * середине грани — там, где сидит хэндл и сходятся линии связи этой стороны, —
 * вынесенная на COLLAPSE_PERP наружу, ровно на линию. Проценты от РЕАЛЬНОГО бокса
 * (50% = середина стороны = хэндл), поэтому точка закреплена у хэндла независимо
 * от размеров; translate(-50%,-50%) центрирует кнопку.
 */
function collapseToggleStyle(side: PortSide): CSSProperties {
  const out = `calc(100% + ${COLLAPSE_PERP}px)`;
  const neg = `-${COLLAPSE_PERP}px`;
  const base: CSSProperties = { transform: 'translate(-50%, -50%)' };
  switch (side) {
    case 'top':
      return { ...base, left: '50%', top: neg };
    case 'bottom':
      return { ...base, left: '50%', top: out };
    case 'left':
      return { ...base, top: '50%', left: neg };
    case 'right':
      return { ...base, top: '50%', left: out };
  }
}

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
  const showStatuses = useUIStore((s) => s.settings.showStatuses);
  const searchMatch = searchQuery !== '' && nodeData.label.toLowerCase().includes(searchQuery);

  const toggleBranchCollapse = useMindMapStore((s) => s.toggleBranchCollapse);
  const updateNodeData = useMindMapStore((s) => s.updateNodeData);
  const customStatuses = useMindMapStore((s) => s.projectSettings.customStatuses);

  // Дети (с sourceHandle их рёбер), прогресс и свёрнутые ветки — из mindMapStore.
  // Каждого ребёнка кодируем как "childId:sourceHandle" (примитивная строка,
  // useShallow/Object.is — массив рвал бы мемоизацию). Роутинг раскладки нужен,
  // чтобы вычислить сторону выхода ТЕМ ЖЕ способом, что рисует MindEdge.
  // Прогресс считается по статусу КАЖДОГО листа независимо — смена статуса
  // родителя никогда не трогает детей (нет каскада), поэтому просто читаем
  // status каждого узла как есть.
  const { progressDone, progressTotal, foldedJoined, childEdgesJoined, layoutType } =
    useMindMapStore(
      useShallow((s) => {
        const childrenOf = new Map<string, string[]>();
        const checkedOf = new Map<string, boolean>();
        const handleOf = new Map<string, string>();
        const routingOf = new Map<string, string>();
        for (const n of s.nodes) checkedOf.set(n.id, n.data.status === 'completed');
        for (const e of s.edges) {
          if (!isTreeEdge(e)) continue;
          const list = childrenOf.get(e.source);
          if (list) list.push(e.target);
          else childrenOf.set(e.source, [e.target]);
          if (e.source === id) {
            handleOf.set(e.target, e.sourceHandle ?? '');
            routingOf.set(e.target, e.data?.style?.routing ?? 'auto');
          }
        }
        const children = childrenOf.get(id) ?? [];
        const p = children.length > 0 ? subtreeProgress(id, childrenOf, checkedOf) : { done: 0, total: 0 };
        const self = s.nodes.find((n) => n.id === id);
        return {
          progressDone: p.done,
          progressTotal: p.total,
          foldedJoined: (self?.data.collapsedChildren ?? []).join(','),
          childEdgesJoined: children
            .map((c) => `${c}:${handleOf.get(c) ?? ''}:${routingOf.get(c) ?? 'auto'}`)
            .join(';'),
          layoutType: s.layoutType,
        };
      }),
    );
  const foldedSet = new Set(foldedJoined === '' ? [] : foldedJoined.split(','));
  const childEdges = childEdgesJoined === '' ? [] : childEdgesJoined.split(';').map((x) => x.split(':'));
  const strategy = getLayoutStrategy(layoutType);

  // Группируем детей по стороне выхода ветки — ОДНА кнопка на сторону (у хэндла),
  // даже если из неё выходит несколько линий. Сторону считаем ТЕМ ЖЕ способом,
  // что MindEdge рисует линию (edgeSourceSide по routing раскладки), по
  // ИЗМЕРЕННОЙ геометрии React Flow (nodeLookup) — иначе кнопка встанет не на ту
  // грань, где реально выходит линия. Свёрнутый потомок остаётся в раскладке
  // (layoutExcludedIds) и в nodeLookup (hidden-узлы там сохраняются), поэтому его
  // сторона стабильна. Возвращаем ПРИМИТИВНУЮ строку "top;right;bottom;left" (id
  // через ','): store RF тикает часто, но Object.is по строке гасит ре-рендеры.
  const sideBucketsJoined = useStore((s) => {
    const rectOf = (n: InternalNode | undefined, root: boolean): Rect | null => {
      if (!n) return null;
      const fb = root ? ROOT_NODE_SIZE : DEFAULT_NODE_SIZE;
      return {
        x: n.internals.positionAbsolute.x,
        y: n.internals.positionAbsolute.y,
        width: n.measured?.width ?? fb.width,
        height: n.measured?.height ?? fb.height,
      };
    };
    const ownRect = rectOf(s.nodeLookup.get(id), isRoot);
    const buckets: Record<PortSide, string[]> = { top: [], right: [], bottom: [], left: [] };
    if (ownRect) {
      // Структура для семантических маршрутов (шина/ось/хребет) — как в MindEdge,
      // через getState: меняется вместе с позициями, которые и так тикают здесь.
      const { nodes, edges } = useMindMapStore.getState();
      const rectById = (nodeId: string): Rect | undefined => {
        const n = s.nodeLookup.get(nodeId);
        return rectOf(n, n?.data?.isRoot === true) ?? undefined;
      };
      for (const [cid, handle, geometry] of childEdges) {
        const cRect = rectOf(s.nodeLookup.get(cid), false);
        if (!cRect) continue;
        buckets[
          edgeSourceSide({
            strategy,
            geometry: toRoutingChoice(geometry),
            sourceId: id,
            targetId: cid,
            ownRect,
            childRect: cRect,
            sourceHandle: handle,
            rectOf: rectById,
            nodes,
            edges,
          })
        ].push(cid);
      }
    }
    return COLLAPSE_SIDES.map((side) => buckets[side].join(',')).join(';');
  });

  // Одна кнопка на сторону: side → id детей, выходящих этой стороной.
  const bucketParts = sideBucketsJoined.split(';');
  const sideChildIds: Record<PortSide, string[]> = {
    top: bucketParts[0] ? bucketParts[0].split(',') : [],
    right: bucketParts[1] ? bucketParts[1].split(',') : [],
    bottom: bucketParts[2] ? bucketParts[2].split(',') : [],
    left: bucketParts[3] ? bucketParts[3].split(',') : [],
  };

  const statusOption = findStatus(nodeData.status, customStatuses);
  const checked = nodeData.status === 'completed';
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
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        useUIStore.getState().openContextMenu(id, e.clientX, e.clientY);
      }}
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
          {showStatuses && !isRoot && !isEditing && (
            <button
              type="button"
              className={clsx(styles.checkbox, checked && styles.checkboxChecked)}
              style={
                statusOption
                  ? {
                      opacity: 1,
                      borderColor: statusOption.color,
                      backgroundColor: statusOption.color,
                      color: '#fff',
                    }
                  : undefined
              }
              aria-pressed={checked}
              aria-label="task"
              onClick={(e) => {
                e.stopPropagation();
                updateNodeData(id, { status: checked ? undefined : 'completed' });
              }}
              onDoubleClick={(e) => e.stopPropagation()}
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
          {showStatuses && progressTotal > 0 && progressDone > 0 && (
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
          onDoubleClick={(e) => e.stopPropagation()}
        >
          ✎
        </button>
      )}
      {COLLAPSE_SIDES.map((side) => {
        const ids = sideChildIds[side];
        if (ids.length === 0) return null;
        // Сторона свёрнута, если ВСЕ её ветки скрыты (клик сворачивает все разом).
        const folded = ids.every((cid) => foldedSet.has(cid));
        return (
          <button
            key={side}
            type="button"
            className={clsx(styles.collapseToggle, folded && styles.collapseToggleCollapsed)}
            style={collapseToggleStyle(side)}
            aria-label="collapse"
            onClick={(e) => {
              e.stopPropagation();
              toggleBranchCollapse(id, ids);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {folded ? ids.length : '−'}
          </button>
        );
      })}
      {noteOpen && <NodeNotePanel nodeId={id} note={nodeData.note ?? ''} />}
    </div>
  );
}

export const MindNode = memo(MindNodeComponent);
