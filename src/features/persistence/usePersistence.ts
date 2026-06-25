import { useCallback, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useMindMapStore } from '../../store/mindMapStore';
import { useUIStore } from '../../store/uiStore';
import { fileService } from './fileService';
import { serializeMindMap, deserializeMindMap } from './serializer';

export interface PersistenceActions {
  handleSave: () => Promise<void>;
  handleSaveAs: () => Promise<void>;
  handleOpen: () => Promise<void>;
  handleNew: () => void;
}

async function withErrorAlert<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    window.alert(`Ошибка: ${message}`);
    return undefined;
  }
}

export function usePersistence(): PersistenceActions {
  const triggerFitView = useUIStore((s) => s.triggerFitView);

  const handleSave = useCallback(async () => {
    await withErrorAlert(async () => {
      const state = useMindMapStore.getState();
      let path = state.filePath;

      if (!path) {
        path = await fileService.showSaveDialog(state.documentName);
        if (!path) return;
      }

      const data = serializeMindMap(
        state.documentName,
        state.layoutType,
        state.nodes,
        state.edges,
      );
      await fileService.saveToPath(path, data);
      state.setFilePath(path);
      state.markSaved();
    });
  }, []);

  const handleSaveAs = useCallback(async () => {
    await withErrorAlert(async () => {
      const state = useMindMapStore.getState();
      const path = await fileService.showSaveDialog(state.documentName);
      if (!path) return;

      const data = serializeMindMap(
        state.documentName,
        state.layoutType,
        state.nodes,
        state.edges,
      );
      await fileService.saveToPath(path, data);
      state.setFilePath(path);
      state.markSaved();
    });
  }, []);

  const handleOpen = useCallback(async () => {
    const { isDirty } = useMindMapStore.getState();
    if (isDirty) {
      if (!window.confirm('Есть несохранённые изменения. Открыть другой файл?')) return;
    }

    await withErrorAlert(async () => {
      const path = await fileService.showOpenDialog();
      if (!path) return;

      const data = await fileService.loadFromPath(path);
      const payload = deserializeMindMap(data);

      const state = useMindMapStore.getState();
      state.loadDocument(payload);
      state.setFilePath(path);
      state.applyAutoLayout();
      setTimeout(triggerFitView, 100);
    });
  }, [triggerFitView]);

  const handleNew = useCallback(() => {
    const { isDirty } = useMindMapStore.getState();
    if (isDirty) {
      if (!window.confirm('Есть несохранённые изменения. Создать новый документ?')) return;
    }
    useMindMapStore.getState().resetDocument();
    setTimeout(triggerFitView, 100);
  }, [triggerFitView]);

  return { handleSave, handleSaveAs, handleOpen, handleNew };
}

export function useWindowCloseGuard(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;

    void getCurrentWindow()
      .onCloseRequested((event) => {
        // Synchronous handler — Tauri 2 needs a sync preventDefault() signal.
        // Clean state → don't preventDefault, let the window close normally.
        const { isDirty } = useMindMapStore.getState();
        if (!isDirty) {
          return;
        }

        // Dirty → block the default close and ask for confirmation.
        // window.confirm is synchronous, so the decision is made within the handler.
        event.preventDefault();
        if (window.confirm('Есть несохранённые изменения. Всё равно закрыть?')) {
          // destroy() closes without re-firing onCloseRequested, so the guard
          // can't re-block it (close() would loop back into this handler).
          void getCurrentWindow().destroy();
        }
      })
      .then((fn) => {
        if (mounted) {
          unlisten = fn;
        } else {
          fn(); // effect already torn down — unlisten immediately
        }
      });

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, []); // register once; isDirty is always fresh via getState()
}
