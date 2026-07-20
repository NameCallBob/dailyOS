/**
 * features/nutrition/store.ts — 飲食頁面本地 UI 狀態（非資料）。
 */

"use client";

import { create } from "zustand";

import type { MealType } from "./types";

export type DateRangeFilter = "today" | "7d" | "30d" | "all";

interface NutritionUiState {
  sheetOpen: boolean;
  editingId: string | null;
  batchMode: boolean;
  dateRange: DateRangeFilter;
  typeFilter: MealType | "all";
  openCreateSheet: () => void;
  openEditSheet: (id: string) => void;
  openBatchSheet: () => void;
  closeSheet: () => void;
  setDateRange: (range: DateRangeFilter) => void;
  setTypeFilter: (type: MealType | "all") => void;
}

export const useNutritionUiStore = create<NutritionUiState>((set) => ({
  sheetOpen: false,
  editingId: null,
  batchMode: false,
  dateRange: "7d",
  typeFilter: "all",
  openCreateSheet: () => set({ sheetOpen: true, editingId: null, batchMode: false }),
  openEditSheet: (id) => set({ sheetOpen: true, editingId: id, batchMode: false }),
  openBatchSheet: () => set({ sheetOpen: true, editingId: null, batchMode: true }),
  closeSheet: () => set({ sheetOpen: false, editingId: null, batchMode: false }),
  setDateRange: (dateRange) => set({ dateRange }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
}));
