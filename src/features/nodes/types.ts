export type NodeShape = 'rect' | 'rounded' | 'ellipse' | 'diamond';
export type BorderPattern = 'solid' | 'dashed' | 'dotted' | 'none';

/**
 * Per-element node style override. All fields optional — absent = use default.
 * Shape, border*, fontSize, fontFamily are rendered starting from step 13.
 * Declaration lives here now so step 13 is "add a field", not "redesign the schema".
 */
export interface NodeStyle {
  shape?: NodeShape;
  borderPattern?: BorderPattern;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

/** Skeleton defaults — used at render time via { ...DEFAULT_NODE_STYLE, ...node.data.style }. */
export const DEFAULT_NODE_STYLE: Required<NodeStyle> = {
  shape: 'rounded',
  borderPattern: 'solid',
  borderColor: 'var(--rm-node-border)',
  borderWidth: 1,
  backgroundColor: 'var(--rm-node-bg)',
  textColor: 'var(--rm-text)',
  fontSize: 14,
  fontFamily: 'inherit',
};

export interface MindNodeData {
  label: string;
  color?: string;
  textColor?: string;
  collapsed?: boolean;
  isRoot?: boolean;
  note?: string;
  style?: NodeStyle;
  [key: string]: unknown; // требование @xyflow/react v12 для Record-совместимости
}

export const MIND_NODE_TYPE = 'mindNode' as const;
export type MindNodeType = typeof MIND_NODE_TYPE;
