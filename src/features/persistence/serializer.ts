import { AppNode, AppEdge } from '../../store/types';
import { SerializedMindMap } from './schema';

export function serializeMindMap(
  documentName: string,
  layoutType: string,
  nodes: AppNode[],
  edges: AppEdge[],
): SerializedMindMap {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function deserializeMindMap(serialized: SerializedMindMap): {
  documentName: string;
  layoutType: string;
  nodes: AppNode[];
  edges: AppEdge[];
} {
  return {
    documentName: serialized.documentName,
    layoutType: serialized.layoutType,
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
