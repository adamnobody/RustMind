export type {
  Group,
  GroupTitlePlacement,
  GroupTitleSide,
  GroupTitleStyle,
} from '../../domain/mind-map';

export const GROUP_NODE_TYPE = 'groupBox' as const;

/** Отступ области группы вокруг узлов (flow-координаты). */
export const GROUP_PADDING = 22;
/** Зазор, на который чужая ветка выносится за рамку группы. */
export const GROUP_CLEARANCE = 16;
/** Высота чипа заголовка — для вёрстки, в bbox узлов не входит. */
export const GROUP_TITLE_HEIGHT = 26;
/** Скругление по умолчанию, совпадает с --rm-radius. */
export const DEFAULT_GROUP_RADIUS = 12;
