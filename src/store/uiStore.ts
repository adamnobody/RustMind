import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface UiState {
  selectedNodeId: string | null;
  editingNodeId: string | null;
  theme: Theme;

  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UiState>((set) => ({
  selectedNodeId: null,
  editingNodeId: null,
  theme: 'dark',

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setEditingNodeId: (id) => set({ editingNodeId: id }),
  setTheme: (theme) => set({ theme }),
}));
