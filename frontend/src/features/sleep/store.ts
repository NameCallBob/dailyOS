/**
 * features/sleep/store.ts — 本模組的本地 UI 狀態（zustand）。
 * 僅存放 UI 狀態（分頁、表單開關、Undo 暫存），資料一律經 repo 取得。
 */

import { create } from "zustand";

import type { SleepLog } from "./schema";

export type SleepTab = "logs" | "insights";

interface SleepUiState {
  tab: SleepTab;
  setTab: (tab: SleepTab) => void;

  formOpen: boolean;
  editingLogId: string | null;
  openCreateForm: () => void;
  openEditForm: (id: string) => void;
  closeForm: () => void;

  /** 剛被刪除（軟刪除）的紀錄，供 Undo 提示條使用；一段時間後自動清除。 */
  lastDeleted: SleepLog | null;
  setLastDeleted: (log: SleepLog | null) => void;
}

export const useSleepUiStore = create<SleepUiState>((set) => ({
  tab: "logs",
  setTab: (tab) => set({ tab }),

  formOpen: false,
  editingLogId: null,
  openCreateForm: () => set({ formOpen: true, editingLogId: null }),
  openEditForm: (id) => set({ formOpen: true, editingLogId: id }),
  closeForm: () => set({ formOpen: false, editingLogId: null }),

  lastDeleted: null,
  setLastDeleted: (log) => set({ lastDeleted: log }),
}));
