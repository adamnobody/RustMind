export type {
  Group,
  GroupTitlePlacement,
  GroupTitleSide,
  GroupTitleStyle,
} from '../../domain/mind-map';

export const GROUP_NODE_TYPE = 'groupBox' as const;

/** Отступ области группы вокруг узлов (flow-координаты). */
export const GROUP_PADDING = 22;
/** Высота чипа заголовка — для вёрстки, в bbox узлов не входит. */
export const GROUP_TITLE_HEIGHT = 26;
/** Скругление по умолчанию, совпадает с --rm-radius. */
export const DEFAULT_GROUP_RADIUS = 12;
