/**
 * Недавние файлы для стартового экрана. Хранятся в localStorage (это
 * preference машины пользователя, не документа), максимум RECENT_LIMIT
 * записей, свежие сверху. Битые данные молча заменяются пустым списком.
 */

export interface RecentFile {
  path: string;
  name: string;
  /** ISO-время последнего открытия/сохранения. */
  openedAt: string;
}

const STORAGE_KEY = 'rustmind-recent';
const RECENT_LIMIT = 8;

export function getRecentFiles(): RecentFile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentFile =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as RecentFile).path === 'string' &&
        typeof (item as RecentFile).name === 'string' &&
        typeof (item as RecentFile).openedAt === 'string',
    );
  } catch {
    return [];
  }
}

function persist(files: RecentFile[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch {
    // квота/приватный режим — недавние просто не сохранятся
  }
}

/** Добавляет/обновляет запись и поднимает её наверх. */
export function addRecentFile(path: string, name: string): void {
  const rest = getRecentFiles().filter((f) => f.path !== path);
  const entry: RecentFile = { path, name, openedAt: new Date().toISOString() };
  persist([entry, ...rest].slice(0, RECENT_LIMIT));
}

/** Убирает запись — например, когда файл больше не открывается. */
export function removeRecentFile(path: string): void {
  persist(getRecentFiles().filter((f) => f.path !== path));
}
