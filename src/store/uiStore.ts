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
  /** Full selection from the canvas; drives the inspector's single-selection rule. */
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  editingNodeId: string | null;
  editingIntent: NodeEditingIntent | null;
  theme: Theme;
  isSettingsOpen: boolean;
  settings: UiSettings;

  /**
   * Inspector (right-docked style panel) visibility — session-only, never
   * persisted nor written to the document.
   * - `inspectorOpen` — is it currently shown.
   * - `inspectorManuallyHidden` — user closed it by hand; this override blocks
   *   auto-open on subsequent selections until they manually open it again.
   */
  inspectorOpen: boolean;
  inspectorManuallyHidden: boolean;

  /** fitView callback registered by the canvas component. Not persisted. */
  _fitViewFn: (() => void) | null;

  setSelectedNodeId: (id: string | null) => void;
  /** Authoritative selection setter called by the canvas; syncs inspector auto-open. */
  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  /** Manual open (toolbar) — clears the manual-hidden override. */
  openInspector: () => void;
  /** Manual hide (panel close button) — sets the override so it won't auto-open. */
  hideInspector: () => void;
  toggleInspector: () => void;
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

/**
 * The inspector edits exactly one element at a time: a single node OR a single
 * edge. Mixed or multi selections have no single editing target.
 */
export function isEditableSelection(nodeIds: string[], edgeIds: string[]): boolean {
  return (
    (nodeIds.length === 1 && edgeIds.length === 0) ||
    (nodeIds.length === 0 && edgeIds.length === 1)
  );
}

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
      selectedNodeIds: [],
      selectedEdgeIds: [],
      editingNodeId: null,
      editingIntent: null,
      theme: initialTheme,
      isSettingsOpen: false,
      settings: defaultSettings,
      inspectorOpen: false,
      inspectorManuallyHidden: false,
      _fitViewFn: null,

      setSelectedNodeId: (id) => get().setSelection(id ? [id] : [], []),
      setSelection: (nodeIds, edgeIds) =>
        set((state) => {
          // Single editable target → auto-open unless the user hid the panel.
          // Anything else (none / multi / mixed) soft-closes WITHOUT setting the
          // manual-hidden override, so the next single selection re-opens it.
          const single = isEditableSelection(nodeIds, edgeIds);
          const inspectorOpen = single
            ? !state.inspectorManuallyHidden || state.inspectorOpen
            : false;
          return {
            selectedNodeIds: nodeIds,
            selectedEdgeIds: edgeIds,
            selectedNodeId: nodeIds[0] ?? null,
            inspectorOpen,
          };
        }),
      openInspector: () => set({ inspectorOpen: true, inspectorManuallyHidden: false }),
      hideInspector: () => set({ inspectorOpen: false, inspectorManuallyHidden: true }),
      toggleInspector: () =>
        get().inspectorOpen ? get().hideInspector() : get().openInspector(),
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
