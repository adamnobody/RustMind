import { useCallback } from 'react';
import { useUIStore } from '../../store/uiStore';
import { translations, type TranslationKey } from './translations';
import type { Locale } from './locales';

type Params = Record<string, string | number>;
export type TFunction = (key: TranslationKey, params?: Params) => string;

function interpolate(str: string, params?: Params): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Перевод для явной локали (без подписки на стор). */
export function translateWith(locale: Locale, key: TranslationKey, params?: Params): string {
  const dict = translations[locale] ?? translations.ru;
  const str = dict[key] ?? translations.ru[key] ?? key;
  return interpolate(str, params);
}

/**
 * Перевод вне React (стор, обработчики, сервисы) — читает текущую локаль из
 * uiStore напрямую. Внутри компонентов используйте useT, чтобы перерисоваться
 * при смене языка.
 */
export function translate(key: TranslationKey, params?: Params): string {
  return translateWith(useUIStore.getState().locale, key, params);
}

/** Хук перевода: возвращает t, привязанную к активной локали (реактивно). */
export function useT(): TFunction {
  const locale = useUIStore((s) => s.locale);
  return useCallback<TFunction>((key, params) => translateWith(locale, key, params), [locale]);
}

/**
 * Совпадает ли метка с дефолтной подписью «дочернего» узла в ЛЮБОЙ локали.
 * Узел мог быть создан при одном языке, а рендерится при другом — плейсхолдер-
 * стиль должен срабатывать независимо от текущей локали.
 */
export function isDefaultChildLabel(label: string): boolean {
  return (Object.keys(translations) as Locale[]).some(
    (loc) => translations[loc]['label.child'] === label,
  );
}
