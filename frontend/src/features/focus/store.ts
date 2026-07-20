/**
 * features/focus/store.ts — 專注模組的本地 UI 狀態（zustand）。
 * 不涉及伺服器/Dexie 資料本身，只管理畫面互動狀態。
 */

import { create } from "zustand";

export type FocusSheet = "start" | "manual" | null;
export type StatsPeriod = "day" | "week" | "month";

interface FocusUiState {
  openSheet: FocusSheet;
  statsPeriod: StatsPeriod;
  openStartSheet: () => void;
  openManualSheet: () => void;
  closeSheet: () => void;
  setStatsPeriod: (period: StatsPeriod) => void;
}

export const useFocusUiStore = create<FocusUiState>((set) => ({
  openSheet: null,
  statsPeriod: "day",
  openStartSheet: () => set({ openSheet: "start" }),
  openManualSheet: () => set({ openSheet: "manual" }),
  closeSheet: () => set({ openSheet: null }),
  setStatsPeriod: (period) => set({ statsPeriod: period }),
}));
