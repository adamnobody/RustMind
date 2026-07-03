import { invoke } from '@tauri-apps/api/core';

/**
 * Фолбэк, когда Tauri invoke недоступен (vite dev в браузере, тесты) или
 * системный список пуст: распространённые шрифты Windows/повсеместные.
 */
export const FALLBACK_FONTS: readonly string[] = [
  'Arial',
  'Calibri',
  'Cambria',
  'Comic Sans MS',
  'Consolas',
  'Courier New',
  'Georgia',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
];

let cached: string[] | null = null;

/**
 * Список семейств системных шрифтов. Rust-команда сканирует диск — результат
 * кэшируем на всё время жизни приложения (набор шрифтов меняется редко).
 */
export async function listSystemFonts(): Promise<string[]> {
  if (cached) return cached;
  try {
    const fonts = await invoke<string[]>('list_system_fonts');
    cached = fonts.length > 0 ? fonts : [...FALLBACK_FONTS];
  } catch {
    cached = [...FALLBACK_FONTS];
  }
  return cached;
}
