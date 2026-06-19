export interface MindNodeData {
  label: string;
  color?: string;
  textColor?: string;
  collapsed?: boolean;
  isRoot?: boolean;
  note?: string;
  [key: string]: unknown; // требование @xyflow/react v12 для Record-совместимости
}

export const MIND_NODE_TYPE = 'mindNode' as const;
export type MindNodeType = typeof MIND_NODE_TYPE;
