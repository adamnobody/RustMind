import type { LayoutKind } from '../engines/layoutTypes';
import type { TranslationKey } from '../../../shared/i18n/translations';

/** Локализованные названия типов раскладки — общие для тулбара и диалога выбора. */
export const LAYOUT_LABEL_KEYS: Record<LayoutKind, TranslationKey> = {
  hierarchy: 'layout.hierarchy',
  right: 'layout.right',
  left: 'layout.left',
  both: 'layout.both',
  tree: 'layout.tree',
  org: 'layout.org',
  logic: 'layout.logic',
  fishbone: 'layout.fishbone',
  timeline: 'layout.timeline',
  bubble: 'layout.bubble',
  network: 'layout.network',
  free: 'layout.free',
};

/** Локализованные краткие описания сути каждого типа — для диалога выбора. */
export const LAYOUT_DESC_KEYS: Record<LayoutKind, TranslationKey> = {
  hierarchy: 'layoutPicker.desc.hierarchy',
  right: 'layoutPicker.desc.right',
  left: 'layoutPicker.desc.left',
  both: 'layoutPicker.desc.both',
  tree: 'layoutPicker.desc.tree',
  org: 'layoutPicker.desc.org',
  logic: 'layoutPicker.desc.logic',
  fishbone: 'layoutPicker.desc.fishbone',
  timeline: 'layoutPicker.desc.timeline',
  bubble: 'layoutPicker.desc.bubble',
  network: 'layoutPicker.desc.network',
  free: 'layoutPicker.desc.free',
};
