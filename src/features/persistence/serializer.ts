import {
  type NodeStyle,
  type HandleOffsets,
  type StatusOption,
  DEFAULT_NODE_STYLE,
} from '../../features/nodes/types';
import { type EdgeStyle, type EdgeKind, DEFAULT_TREE_EDGE_HANDLES, DEFAULT_EDGE_STYLE } from '../../features/edges/types';
import type { Group } from '../../features/groups/types';
import type { AppNode, AppEdge, LayoutType, LoadDocumentPayload, HandleVisibility, ProjectSettings } from '../../store/types';
import type { SerializedMindMap } from './schema';
import { FILE_VERSION } from './schema';
import { DEFAULT_HANDLE_VISIBILITY } from '../../shared/lib/constants';
import { pruneStyle } from '../../shared/lib/style';
import { coerceLayoutKind } from '../layout/engines/layoutTypes';
import { normalizeStructure } from '../layout/strategies/normalize';

const VALID_HANDLE_VISIBILITIES: HandleVisibility[] = ['hidden', 'dashed', 'always'];

/**
 * Единая точка миграции layoutType: известные новые значения — как есть,
 * legacy ('tree-LR'/'tree-TB' → 'hierarchy', 'radial' → 'tree', а также
 * упразднённые free/block/bridge/multiflow/dialogue/flowchart) — мапятся,
 * неизвестное — дефолт 'hierarchy'.
 */
function coerceLayoutType(value: string): LayoutType {
  return coerceLayoutKind(value);
}

function coerceHandleVisibility(value: string | undefined): HandleVisibility {
  return VALID_HANDLE_VISIBILITIES.includes(value as HandleVisibility)
    ? (value as HandleVisibility)
    : DEFAULT_HANDLE_VISIBILITY;
}

export function serializeMindMap(
  documentName: string,
  layoutType: string,
  nodes: AppNode[],
  edges: AppEdge[],
  projectSettings: ProjectSettings,
  groups: Group[] = [],
  createdAt?: string,
): SerializedMindMap {
  const now = new Date().toISOString();
  return {
    version: FILE_VERSION,
    documentName,
    layoutType,
    nodes: nodes.map((n) => ({
      id: n.id,
      position: n.position,
      data: {
        label: n.data.label,
        color: n.data.color,
        textColor: n.data.textColor,
        collapsed: n.data.collapsed,
        collapsedChildren:
          n.data.collapsedChildren && n.data.collapsedChildren.length > 0
            ? n.data.collapsedChildren
            : undefined,
        status: n.data.status,
        isRoot: n.data.isRoot,
        note: n.data.note,
        style: pruneStyle(n.data.style, DEFAULT_NODE_STYLE),
        // Стор хранит только отклонения от центра — пишем как есть.
        handleOffsets: n.data.handleOffsets,
        order: n.data.order,
      },
    })),
    edges: edges.map((e) => {
      const data: { kind?: EdgeKind; style?: EdgeStyle } = {};
      if (e.data?.kind) data.kind = e.data.kind;
      const cleanEdgeStyle = pruneStyle(e.data?.style, DEFAULT_EDGE_STYLE);
      if (cleanEdgeStyle) data.style = cleanEdgeStyle;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        data: Object.keys(data).length > 0 ? data : undefined,
      };
    }),
    groups:
      groups.length > 0
        ? groups.map((g) => ({
            id: g.id,
            title: g.title,
            nodeIds: g.nodeIds,
            color: g.color,
            titleStyle: g.titleStyle,
          }))
        : undefined,
    projectSettings: {
      handleVisibility: projectSettings.handleVisibility,
      backgroundColor: projectSettings.backgroundColor,
      backgroundImage: projectSettings.backgroundImage,
      edgeColor: projectSettings.edgeColor,
      levelColors: projectSettings.levelColors,
      customStatuses: projectSettings.customStatuses,
    },
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
}

export function deserializeMindMap(serialized: SerializedMindMap): LoadDocumentPayload {
  const layoutType = coerceLayoutType(serialized.layoutType);

  const nodes: AppNode[] = serialized.nodes.map((n) => ({
    id: n.id,
    type: 'mindNode' as const,
    position: n.position,
    data: {
      label: n.data.label,
      color: n.data.color,
      textColor: n.data.textColor,
      collapsed: n.data.collapsed,
      collapsedChildren: n.data.collapsedChildren,
      // Legacy: checked:true (до статусов) → status:'completed'. Явный status
      // в файле (даже если checked тоже есть) имеет приоритет.
      status: n.data.status ?? (n.data.checked ? 'completed' : undefined),
      isRoot: n.data.isRoot,
      note: n.data.note,
      // Serialized style uses string for union fields; cast to domain type.
      style: n.data.style as NodeStyle | undefined,
      handleOffsets: n.data.handleOffsets as HandleOffsets | undefined,
      order: n.data.order,
    },
  }));

  const edges: AppEdge[] = serialized.edges.map((e) => {
    // Миграция: ребро без kind → 'tree'. Только явное 'free' остаётся free.
    const kind: EdgeKind = e.data?.kind === 'free' ? 'free' : 'tree';
    // Backfill ТОЛЬКО для старых файлов: структурное ребро без хэндлов уехало
    // бы в 'top' (первый хэндл в DOM). Ставим фиксированный дефолт. Рёбра, у
    // которых хэндлы есть, не трогаем — сохранённый хэндл свят.
    const needsBackfill = kind === 'tree' && (!e.sourceHandle || !e.targetHandle);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? (needsBackfill ? DEFAULT_TREE_EDGE_HANDLES.sourceHandle : undefined),
      targetHandle: e.targetHandle ?? (needsBackfill ? DEFAULT_TREE_EDGE_HANDLES.targetHandle : undefined),
      data: { kind, style: e.data?.style as EdgeStyle | undefined },
    };
  });

  // Инварианты структурной модели (один корень, один родитель на некорневой
  // узел, контактный order) — здесь, а не в сторе: loadDocument получает уже
  // валидную структуру и делает единственный пересчёт ПОЗИЦИЙ для derived.
  const normalized = normalizeStructure(nodes, edges, layoutType);

  // Группы: чиним ссылки на удалённые узлы, распускаем опустевшие.
  const nodeIdSet = new Set(normalized.nodes.map((n) => n.id));
  const groups: Group[] = (serialized.groups ?? [])
    .map((g) => ({
      id: g.id,
      title: g.title,
      nodeIds: g.nodeIds.filter((id) => nodeIdSet.has(id)),
      color: g.color,
      titleStyle: g.titleStyle,
    }))
    .filter((g) => g.nodeIds.length > 0);

  return {
    documentName: serialized.documentName,
    layoutType,
    groups,
    projectSettings: {
      handleVisibility: coerceHandleVisibility(serialized.projectSettings?.handleVisibility),
      backgroundColor: serialized.projectSettings?.backgroundColor,
      backgroundImage: serialized.projectSettings?.backgroundImage,
      edgeColor: serialized.projectSettings?.edgeColor,
      levelColors: serialized.projectSettings?.levelColors,
      customStatuses: serialized.projectSettings?.customStatuses as StatusOption[] | undefined,
    },
    nodes: normalized.nodes,
    edges: normalized.edges,
  };
}
