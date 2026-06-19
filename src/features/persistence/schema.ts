export const FILE_VERSION = 1;
export const FILE_EXTENSION = 'rustmind';

export interface SerializedNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    color?: string;
    textColor?: string;
    collapsed?: boolean;
    isRoot?: boolean;
    note?: string;
  };
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
}

export interface SerializedMindMap {
  version: number;
  documentName: string;
  layoutType: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  createdAt: string;
  updatedAt: string;
}
