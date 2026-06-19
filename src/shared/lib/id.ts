import { nanoid } from 'nanoid';

/** Генерирует уникальный ID узла */
export const generateNodeId = (): string => `node_${nanoid(10)}`;

/** Генерирует уникальный ID связи */
export const generateEdgeId = (source: string, target: string): string =>
  `edge_${source}__${target}`;
