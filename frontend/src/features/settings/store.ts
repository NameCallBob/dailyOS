/**
 * features/settings/store.ts — 設定頁的本地 UI 狀態（非伺服器資料）。
 */

"use client";

import { create } from "zustand";

export type SettingsTab = "profile" | "notifications" | "privacy" | "data" | "mode";

interface SettingsUiState {
  tab: SettingsTab;
  setTab: (tab: SettingsTab) => void;
  deleteDialogOpen: boolean;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  resetDialogOpen: boolean;
  openResetDialog: () => void;
  closeResetDialog: () => void;
}

export const useSettingsUiStore = create<SettingsUiState>((set) => ({
  tab: "profile",
  setTab: (tab) => set({ tab }),
  deleteDialogOpen: false,
  openDeleteDialog: () => set({ deleteDialogOpen: true }),
  closeDeleteDialog: () => set({ deleteDialogOpen: false }),
  resetDialogOpen: false,
  openResetDialog: () => set({ resetDialogOpen: true }),
  closeResetDialog: () => set({ resetDialogOpen: false }),
}));
