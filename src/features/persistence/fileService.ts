import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { translate } from '../../shared/i18n';
import { SerializedMindMap, FILE_EXTENSION } from './schema';

const DIALOG_FILTERS = [{ name: 'RustMind Map', extensions: [FILE_EXTENSION] }];

function isSerializedMindMap(value: unknown): value is SerializedMindMap {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === 'number' &&
    typeof v.documentName === 'string' &&
    Array.isArray(v.nodes) &&
    Array.isArray(v.edges)
  );
}

export const fileService = {
  async saveToPath(path: string, data: SerializedMindMap): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await invoke<void>('write_file', { path, content });
  },

  /** Запись произвольного текста (SVG-экспорт). */
  async saveTextToPath(path: string, content: string): Promise<void> {
    await invoke<void>('write_file', { path, content });
  },

  /** Запись бинарного файла (PNG/PDF-экспорт): байты передаём массивом чисел. */
  async saveBytesToPath(path: string, bytes: Uint8Array): Promise<void> {
    await invoke<void>('write_binary_file', { path, bytes: Array.from(bytes) });
  },

  async loadFromPath(path: string): Promise<SerializedMindMap> {
    const content = await invoke<string>('read_file', { path });
    const parsed: unknown = JSON.parse(content);
    if (!isSerializedMindMap(parsed)) {
      throw new Error(translate('file.invalidFormat'));
    }
    return parsed;
  },

  async renameFile(from: string, to: string): Promise<void> {
    await invoke<void>('rename_file', { from, to });
  },

  async deleteFile(path: string): Promise<void> {
    await invoke<void>('delete_file', { path });
  },

  /** Побайтовая копия файла (для «клонировать») — без разбора схемы. */
  async copyFile(from: string, to: string): Promise<void> {
    const content = await invoke<string>('read_file', { path: from });
    await invoke<void>('write_file', { path: to, content });
  },

  async fileExists(path: string): Promise<boolean> {
    try {
      await invoke<string>('read_file', { path });
      return true;
    } catch {
      return false;
    }
  },

  async showOpenDialog(): Promise<string | null> {
    const result = await open({ filters: DIALOG_FILTERS, multiple: false });
    if (!result || Array.isArray(result)) return null;
    return result;
  },

  async showSaveDialog(defaultName?: string): Promise<string | null> {
    const result = await save({
      filters: DIALOG_FILTERS,
      defaultPath: defaultName,
    });
    return result ?? null;
  },

  /** Диалог сохранения для экспорта картинки/PDF (свой фильтр расширения). */
  async showSaveImageDialog(
    defaultName: string,
    ext: string,
    label: string,
  ): Promise<string | null> {
    const result = await save({
      filters: [{ name: label, extensions: [ext] }],
      defaultPath: `${defaultName}.${ext}`,
    });
    return result ?? null;
  },
};
