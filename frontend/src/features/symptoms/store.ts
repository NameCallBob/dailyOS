/**
 * features/symptoms/store.ts — 本模組的本地 UI 狀態（zustand）。
 * 僅存放 UI 狀態（篩選、表單開關、Undo 暫存），資料一律經 repo 取得。
 */

import { create } from "zustand";

import type { SymptomLog } from "./schema";

export type SymptomDefFilter = "active" | "all";

interface SymptomsUiState {
  // 篩選
  categoryFilter: string | "all";
  symptomDefFilter: string | "all";
  setCategoryFilter: (value: string | "all") => void;
  setSymptomDefFilter: (value: string | "all") => void;

  // 症狀紀錄表單（新增/編輯）
  logFormOpen: boolean;
  editingLogId: string | null;
  openCreateLog: (defId?: string) => void;
  openEditLog: (logId: string) => void;
  closeLogForm: () => void;
  /** 由「快速紀錄」按鈕預帶的症狀定義 id */
  prefillDefId: string | null;

  // 症狀定義管理（新增/編輯自訂症狀）
  defManagerOpen: boolean;
  editingDefId: string | null;
  openCreateDef: () => void;
  openEditDef: (defId: string) => void;
  closeDefForm: () => void;

  // 刪除 Undo
  lastDeletedLog: SymptomLog | null;
  setLastDeletedLog: (log: SymptomLog | null) => void;
}

export const useSymptomsUiStore = create<SymptomsUiState>((set) => ({
  categoryFilter: "all",
  symptomDefFilter: "all",
  setCategoryFilter: (value) => set({ categoryFilter: value }),
  setSymptomDefFilter: (value) => set({ symptomDefFilter: value }),

  logFormOpen: false,
  editingLogId: null,
  prefillDefId: null,
  openCreateLog: (defId) => set({ logFormOpen: true, editingLogId: null, prefillDefId: defId ?? null }),
  openEditLog: (logId) => set({ logFormOpen: true, editingLogId: logId, prefillDefId: null }),
  closeLogForm: () => set({ logFormOpen: false, editingLogId: null, prefillDefId: null }),

  defManagerOpen: false,
  editingDefId: null,
  openCreateDef: () => set({ defManagerOpen: true, editingDefId: null }),
  openEditDef: (defId) => set({ defManagerOpen: true, editingDefId: defId }),
  closeDefForm: () => set({ defManagerOpen: false, editingDefId: null }),

  lastDeletedLog: null,
  setLastDeletedLog: (log) => set({ lastDeletedLog: log }),
}));
