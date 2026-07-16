import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LOCALE, type Locale } from '../shared/i18n/locales';

export type Theme = 'dark' | 'light';
export type NodeFontSize = 's' | 'm' | 'l';
export type NodeEditingMode = 'edit' | 'replace';
export type BackgroundPattern = 'dots' | 'lines' | 'cross';

export interface NodeEditingIntent {
  mode: NodeEditingMode;
  initialValue?: string;
}

/**
 * Транзиентный индикатор drop-цели во время drag (XMind-модель): куда встанет
 * перетаскиваемый узел, если отпустить сейчас. Никогда не сериализуется и не
 * попадает в историю — только для подсветки будущего родителя в MindNode.
 */
export interface DragIndicator {
  kind: 'reparent' | 'reorder';
  parentId: string;
  index?: number;
}

interface UiSettings {
  nodeFontSize: NodeFontSize;
  showGrid: boolean;
  showMiniMap: boolean;
  showControls: boolean;
  confirmBranchDelete: boolean;
  /** Паттерн фона холста (когда showGrid включён). */
  backgroundPattern: BackgroundPattern;
  /** Яркость паттерна фона: 0–100 → альфа 0–1. */
  backgroundBrightness: number;
  /** Акцентный цвет главного меню (hex). */
  homeAccent: string;
  /** Шрифт главного меню (семейство). */
  homeFont: string;
}

interface UiState {
  selectedNodeId: string | null;
  /** Full selection from the canvas; drives the inspector's single-selection rule. */
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  editingNodeId: string | null;
  editingIntent: NodeEditingIntent | null;
  /** Ребро, чья подпись редактируется инлайн (двойной клик). Session-only. */
  editingEdgeId: string | null;
  /** Короткое всплывающее уведомление (например, «связь запрещена»). */
  notice: string | null;
  theme: Theme;
  /** Язык интерфейса. */
  locale: Locale;
  isSettingsOpen: boolean;
  /** Диалог выбора типа карты — открывается для нового документа и по кнопке в тулбаре. */
  isLayoutPickerOpen: boolean;
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

  /** Текущая drop-цель во время drag узла (see DragIndicator). Session-only. */
  dragIndicator: DragIndicator | null;
  setDragIndicator: (indicator: DragIndicator | null) => void;

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
  setEditingEdgeId: (id: string | null) => void;
  /** Показать тост; сам гаснет через пару секунд. */
  showNotice: (message: string) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLocale: (locale: Locale) => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  openLayoutPicker: () => void;
  closeLayoutPicker: () => void;
  setNodeFontSize: (size: NodeFontSize) => void;
  setCanvasOption: (
    key: 'showGrid' | 'showMiniMap' | 'showControls',
    value: boolean,
  ) => void;
  setBackgroundPattern: (pattern: BackgroundPattern) => void;
  setBackgroundBrightness: (value: number) => void;
  setHomeAccent: (hex: string) => void;
  setHomeFont: (font: string) => void;
  setBehaviorOption: (key: 'confirmBranchDelete', value: boolean) => void;
  registerFitView: (fn: () => void) => void;
  triggerFitView: () => void;
}

const STORAGE_KEY = 'rustmind-ui';

const defaultSettings: UiSettings = {
  nodeFontSize: 'm',
  showGrid: true,
  showMiniMap: true,
  showControls: true,
  confirmBranchDelete: false,
  backgroundPattern: 'dots',
  // 26 ≈ прежняя захардкоженная альфа сетки (rgba …, 0.26)
  backgroundBrightness: 26,
  homeAccent: '#5fd4ff',
  homeFont: 'IBM Plex Mono',
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
      editingEdgeId: null,
      notice: null,
      theme: initialTheme,
      locale: DEFAULT_LOCALE,
      isSettingsOpen: false,
      isLayoutPickerOpen: false,
      settings: defaultSettings,
      inspectorOpen: false,
      inspectorManuallyHidden: false,
      _fitViewFn: null,
      dragIndicator: null,
      setDragIndicator: (indicator) => set({ dragIndicator: indicator }),

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
      setEditingEdgeId: (id) => set({ editingEdgeId: id }),
      showNotice: (message) => {
        set({ notice: message });
        // Гасим только СВОЁ сообщение: если за это время показали новое,
        // таймер устаревшего не должен его стереть.
        setTimeout(() => {
          if (get().notice === message) {
            set({ notice: null });
          }
        }, 2600);
      },
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const nextTheme: Theme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        set({ theme: nextTheme });
      },
      setLocale: (locale) => set({ locale }),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      openLayoutPicker: () => set({ isLayoutPickerOpen: true }),
      closeLayoutPicker: () => set({ isLayoutPickerOpen: false }),
      setNodeFontSize: (size) =>
        set((state) => ({
          settings: { ...state.settings, nodeFontSize: size },
        })),
      setCanvasOption: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      setBackgroundPattern: (pattern) =>
        set((state) => ({
          settings: { ...state.settings, backgroundPattern: pattern },
        })),
      setBackgroundBrightness: (value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            backgroundBrightness: Math.min(100, Math.max(0, value)),
          },
        })),
      setHomeAccent: (hex) =>
        set((state) => ({
          settings: { ...state.settings, homeAccent: hex },
        })),
      setHomeFont: (font) =>
        set((state) => ({
          settings: { ...state.settings, homeFont: font },
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
        locale: state.locale,
        settings: state.settings,
      }),
      // Deep-merge settings: localStorage со старой версией settings иначе
      // целиком заменил бы объект и потерял ключи, добавленные позже.
      merge: (persisted, current) => {
        const p = persisted as
          | { theme?: Theme; locale?: Locale; settings?: Partial<UiSettings> }
          | undefined;
        return {
          ...current,
          ...(p ?? {}),
          settings: { ...current.settings, ...(p?.settings ?? {}) },
        };
      },
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.theme ?? 'dark');
      },
    },
  ),
);
