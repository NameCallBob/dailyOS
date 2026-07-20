/**
 * features/rehab/store.ts — 本模組的本地 UI 狀態（非同步資源一律走 resources.ts）。
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { REHAB_STORAGE_KEY } from "./constants";

interface RehabUiState {
  /** 目前分頁：today / plans / timeline / summary */
  tab: string;
  setTab: (tab: string) => void;
  /** 目前選定的計畫 id（供「計畫」「時間線」「摘要」分頁共用） */
  selectedPlanId: string | null;
  setSelectedPlanId: (id: string | null) => void;
}

export const useRehabUiStore = create<RehabUiState>()(
  persist(
    (set) => ({
      tab: "today",
      setTab: (tab) => set({ tab }),
      selectedPlanId: null,
      setSelectedPlanId: (id) => set({ selectedPlanId: id }),
    }),
    { name: REHAB_STORAGE_KEY, partialize: (state) => ({ selectedPlanId: state.selectedPlanId }) },
  ),
);
