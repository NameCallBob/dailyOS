import { create } from "zustand";

interface QuickAddState {
  open: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
