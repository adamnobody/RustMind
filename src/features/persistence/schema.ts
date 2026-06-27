export const FILE_VERSION = 1;
export const FILE_EXTENSION = 'rustmind';

interface SerializedNodeStyle {
  shape?: string;
  borderPattern?: string;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

interface SerializedEdgeStyle {
  linePattern?: string;
  strokeWidth?: number;
  strokeColor?: string;
  sourceArrow?: string;
  targetArrow?: string;
}

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
    style?: SerializedNodeStyle;
  };
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: { kind?: string; style?: SerializedEdgeStyle };
}

interface SerializedProjectSettings {
  handleVisibility?: string;
}

export interface SerializedMindMap {
  version: number;
  documentName: string;
  layoutType: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  projectSettings?: SerializedProjectSettings;
  createdAt: string;
  updatedAt: string;
}
