/** Начертание/шрифт заголовка группы (аналог NodeStyle, только для подписи). */
export interface GroupTitleStyle {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

/**
 * Группа — полупрозрачная область, накрывающая набор узлов, с редактируемым
 * заголовком. Границы группы вычисляются на лету из позиций её узлов (не
 * хранятся); группа НЕ участвует в структуре дерева/раскладке.
 */
export interface Group {
  id: string;
  title: string;
  nodeIds: string[];
  /** Оттенок заливки (hex); отсутствие — акцент по умолчанию. */
  color?: string;
  titleStyle?: GroupTitleStyle;
}

export const GROUP_NODE_TYPE = 'groupBox' as const;

/** Отступ области группы вокруг узлов и высота полосы заголовка (flow-координаты). */
export const GROUP_PADDING = 22;
export const GROUP_TITLE_HEIGHT = 26;
