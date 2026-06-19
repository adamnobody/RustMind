import { create } from 'zustand';

interface UIState {
  selectedNodeId: string | null;
  editingNodeId: string | null;
  theme: 'light' | 'dark';
  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedNodeId: null,
  editingNodeId: null,
  theme: 'light',
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setEditingNodeId: (id) => set({ editingNodeId: id }),
  setTheme: (theme) => set({ theme }),
}));
