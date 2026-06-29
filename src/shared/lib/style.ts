/**
 * Shared style-pruning used by BOTH the persistence layer (what gets written to
 * disk) and the store (what lives in memory). Keeping one function — fed the same
 * default constant from both sides — guarantees the two layers can't drift: a
 * field is persisted iff it's a real, non-default override.
 *
 * Drops, and returns `undefined` if nothing survives:
 * - `undefined` values (no override),
 * - values equal to their default (when `defaults` is supplied) — a field set to
 *   its default is indistinguishable from "no override", so storing it only bloats
 *   the document and muddies dirty-tracking.
 */
export function pruneStyle<T extends object>(style: T | undefined, defaults?: Partial<T>): T | undefined {
  if (!style) return undefined;
  const cleaned = Object.fromEntries(
    Object.entries(style).filter(
      ([key, value]) =>
        value !== undefined && (defaults === undefined || value !== defaults[key as keyof T]),
    ),
  ) as T;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
