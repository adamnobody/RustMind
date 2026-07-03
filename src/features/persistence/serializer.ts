import { type NodeStyle, type HandleOffsets, DEFAULT_NODE_STYLE } from '../../features/nodes/types';
import { type EdgeStyle, type EdgeKind, DEFAULT_TREE_EDGE_HANDLES, DEFAULT_EDGE_STYLE } from '../../features/edges/types';
import type { AppNode, AppEdge, LayoutType, LoadDocumentPayload, HandleVisibility, ProjectSettings } from '../../store/types';
import type { SerializedMindMap } from './schema';
import { FILE_VERSION } from './schema';
import { DEFAULT_HANDLE_VISIBILITY } from '../../shared/lib/constants';
import { pruneStyle } from '../../shared/lib/style';

const VALID_LAYOUT_TYPES: LayoutType[] = ['tree-LR', 'tree-TB', 'radial'];
const VALID_HANDLE_VISIBILITIES: HandleVisibility[] = ['hidden', 'dashed', 'always'];

function coerceLayoutType(value: string): LayoutType {
  return VALID_LAYOUT_TYPES.includes(value as LayoutType) ? (value as LayoutType) : 'tree-LR';
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
        isRoot: n.data.isRoot,
        note: n.data.note,
        style: pruneStyle(n.data.style, DEFAULT_NODE_STYLE),
        // Стор хранит только отклонения от центра — пишем как есть.
        handleOffsets: n.data.handleOffsets,
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
    projectSettings: {
      handleVisibility: projectSettings.handleVisibility,
    },
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
}

export function deserializeMindMap(serialized: SerializedMindMap): LoadDocumentPayload {
  const layoutType = coerceLayoutType(serialized.layoutType);

  return {
    documentName: serialized.documentName,
    layoutType,
    projectSettings: {
      handleVisibility: coerceHandleVisibility(serialized.projectSettings?.handleVisibility),
    },
    nodes: serialized.nodes.map((n) => ({
      id: n.id,
      type: 'mindNode' as const,
      position: n.position,
      data: {
        label: n.data.label,
        color: n.data.color,
        textColor: n.data.textColor,
        collapsed: n.data.collapsed,
        isRoot: n.data.isRoot,
        note: n.data.note,
        // Serialized style uses string for union fields; cast to domain type.
        style: n.data.style as NodeStyle | undefined,
        handleOffsets: n.data.handleOffsets as HandleOffsets | undefined,
      },
    })),
    edges: serialized.edges.map((e) => {
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
    }),
  };
}
