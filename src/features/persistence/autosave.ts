import { useEffect } from 'react';
import { useMindMapStore } from '../../store/mindMapStore';
import { serializeMindMap } from './serializer';
import type { SerializedMindMap } from './schema';

const KEY = 'rustmind-autosave';
const DEFAULT_INTERVAL_MS = 5000;

export interface AutosaveDraft {
  serialized: SerializedMindMap;
  filePath: string | null;
  savedAt: string;
}

/** Best-effort: сбой квоты localStorage не должен ронять приложение. */
export function saveDraft(serialized: SerializedMindMap, filePath: string | null): void {
  try {
    const draft: AutosaveDraft = { serialized, filePath, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* квота/приватный режим — автосейв необязателен */
  }
}

export function readDraft(): AutosaveDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutosaveDraft;
    return parsed && parsed.serialized ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Периодически (по умолчанию раз в 5 с) сбрасывает грязный документ в
 * localStorage как черновик восстановления после краха. Чистый документ —
 * чистим черновик. Восстановление предлагает App при старте (см. readDraft).
 */
export function useAutosave(intervalMs = DEFAULT_INTERVAL_MS): void {
  useEffect(() => {
    const id = setInterval(() => {
      const s = useMindMapStore.getState();
      if (s.isDirty) {
        const data = serializeMindMap(
          s.documentName,
          s.layoutType,
          s.nodes,
          s.edges,
          s.projectSettings,
          s.groups,
        );
        saveDraft(data, s.filePath);
      } else {
        clearDraft();
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
