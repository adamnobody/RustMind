import { AppNode, AppEdge, LayoutType, LoadDocumentPayload } from '../../store/types';
import { SerializedMindMap } from './schema';

const VALID_LAYOUT_TYPES: LayoutType[] = ['tree-LR', 'tree-TB', 'radial'];

function coerceLayoutType(value: string): LayoutType {
  return VALID_LAYOUT_TYPES.includes(value as LayoutType) ? (value as LayoutType) : 'tree-LR';
}

export function serializeMindMap(
  documentName: string,
  layoutType: string,
  nodes: AppNode[],
  edges: AppEdge[],
  createdAt?: string,
): SerializedMindMap {
  const now = new Date().toISOString();
  return {
    version: 1,
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
      },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
}

export function deserializeMindMap(serialized: SerializedMindMap): LoadDocumentPayload {
  return {
    documentName: serialized.documentName,
    layoutType: coerceLayoutType(serialized.layoutType),
    nodes: serialized.nodes.map((n) => ({
      id: n.id,
      type: 'mindNode',
      position: n.position,
      data: n.data,
    })),
    edges: serialized.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  };
}
