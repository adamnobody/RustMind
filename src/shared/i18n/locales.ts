/** Поддерживаемые языки интерфейса. Порядок = порядок во флайауте главного меню. */
export type Locale = 'ru' | 'en' | 'de' | 'fr';

export interface LocaleMeta {
  code: Locale;
  /** Самоназвание языка (для меню выбора). */
  native: string;
  /** BCP-47 тег для Intl (форматирование дат недавних файлов). */
  tag: string;
}

export const LOCALES: readonly LocaleMeta[] = [
  { code: 'ru', native: 'Русский', tag: 'ru-RU' },
  { code: 'en', native: 'English', tag: 'en-US' },
  { code: 'de', native: 'Deutsch', tag: 'de-DE' },
  { code: 'fr', native: 'Français', tag: 'fr-FR' },
];

export const DEFAULT_LOCALE: Locale = 'ru';

export function localeTag(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)?.tag ?? 'ru-RU';
}
