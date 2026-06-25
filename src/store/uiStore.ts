import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';
export type NodeFontSize = 's' | 'm' | 'l';
export type NodeEditingMode = 'edit' | 'replace';

export interface NodeEditingIntent {
  mode: NodeEditingMode;
  initialValue?: string;
}

interface UiSettings {
  nodeFontSize: NodeFontSize;
  showGrid: boolean;
  showMiniMap: boolean;
  showControls: boolean;
  autoLayoutOnChange: boolean;
  confirmBranchDelete: boolean;
}

interface UiState {
  selectedNodeId: string | null;
  editingNodeId: string | null;
  editingIntent: NodeEditingIntent | null;
  theme: Theme;
  isSettingsOpen: boolean;
  settings: UiSettings;

  /** fitView callback registered by the canvas component. Not persisted. */
  _fitViewFn: (() => void) | null;

  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null, intent?: NodeEditingIntent) => void;
  startNodeEditing: (id: string, intent?: NodeEditingIntent) => void;
  clearNodeEditing: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  setNodeFontSize: (size: NodeFontSize) => void;
  setCanvasOption: (
    key: 'showGrid' | 'showMiniMap' | 'showControls',
    value: boolean,
  ) => void;
  setBehaviorOption: (
    key: 'autoLayoutOnChange' | 'confirmBranchDelete',
    value: boolean,
  ) => void;
  registerFitView: (fn: () => void) => void;
  triggerFitView: () => void;
}

const STORAGE_KEY = 'rustmind-ui';

const defaultSettings: UiSettings = {
  nodeFontSize: 'm',
  showGrid: true,
  showMiniMap: true,
  showControls: true,
  autoLayoutOnChange: false,
  confirmBranchDelete: false,
};

function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
}

function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const persisted = window.localStorage.getItem(STORAGE_KEY);
  if (!persisted) {
    return 'dark';
  }

  try {
    const parsed = JSON.parse(persisted) as {
      state?: {
        theme?: unknown;
      };
    };
    return parsed.state?.theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

const initialTheme = resolveInitialTheme();
applyTheme(initialTheme);

export const useUIStore = create<UiState>()(
  persist(
    (set, get) => ({
      selectedNodeId: null,
      editingNodeId: null,
      editingIntent: null,
      theme: initialTheme,
      isSettingsOpen: false,
      settings: defaultSettings,
      _fitViewFn: null,

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setEditingNodeId: (id, intent = { mode: 'edit' }) =>
        set({
          editingNodeId: id,
          editingIntent: id ? intent : null,
        }),
      startNodeEditing: (id, intent = { mode: 'edit' }) =>
        set({
          editingNodeId: id,
          editingIntent: intent,
        }),
      clearNodeEditing: () =>
        set({
          editingNodeId: null,
          editingIntent: null,
        }),
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const nextTheme: Theme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        set({ theme: nextTheme });
      },
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      setNodeFontSize: (size) =>
        set((state) => ({
          settings: { ...state.settings, nodeFontSize: size },
        })),
      setCanvasOption: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      setBehaviorOption: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      registerFitView: (fn) => set({ _fitViewFn: fn }),
      triggerFitView: () => get()._fitViewFn?.(),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        theme: state.theme,
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? 'dark');
      },
    },
  ),
);
