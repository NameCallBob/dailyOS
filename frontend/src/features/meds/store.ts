/**
 * features/meds/store.ts — 本模組的本地 UI 狀態（zustand）。
 * 僅存放 UI 狀態（分頁、表單開關、對話框、Undo 暫存），資料一律經 repo 取得。
 */

import { create } from "zustand";

import type { Medication, SourceType } from "./types";

export type MedsTab = "medication" | "supplement" | "logs";

/** 刪除後的復原暫存（含來源類型，因為 medications/supplements 是不同資源表） */
export interface DeletedItem {
  item: Medication;
  sourceType: SourceType;
}

interface MedsUiState {
  tab: MedsTab;
  setTab: (tab: MedsTab) => void;

  formOpen: boolean;
  formSourceType: SourceType;
  editingItemId: string | null;
  openCreateForm: (sourceType: SourceType) => void;
  openEditForm: (sourceType: SourceType, itemId: string) => void;
  closeForm: () => void;

  doseDialogItemId: string | null;
  doseDialogSourceType: SourceType;
  openDoseDialog: (sourceType: SourceType, itemId: string) => void;
  closeDoseDialog: () => void;

  refillDialogItemId: string | null;
  refillDialogSourceType: SourceType;
  openRefillDialog: (sourceType: SourceType, itemId: string) => void;
  closeRefillDialog: () => void;

  lastDeleted: DeletedItem | null;
  setLastDeleted: (deleted: DeletedItem | null) => void;
}

export const useMedsUiStore = create<MedsUiState>((set) => ({
  tab: "medication",
  setTab: (tab) => set({ tab }),

  formOpen: false,
  formSourceType: "medication",
  editingItemId: null,
  openCreateForm: (sourceType) => set({ formOpen: true, formSourceType: sourceType, editingItemId: null }),
  openEditForm: (sourceType, itemId) => set({ formOpen: true, formSourceType: sourceType, editingItemId: itemId }),
  closeForm: () => set({ formOpen: false, editingItemId: null }),

  doseDialogItemId: null,
  doseDialogSourceType: "medication",
  openDoseDialog: (sourceType, itemId) => set({ doseDialogItemId: itemId, doseDialogSourceType: sourceType }),
  closeDoseDialog: () => set({ doseDialogItemId: null }),

  refillDialogItemId: null,
  refillDialogSourceType: "medication",
  openRefillDialog: (sourceType, itemId) => set({ refillDialogItemId: itemId, refillDialogSourceType: sourceType }),
  closeRefillDialog: () => set({ refillDialogItemId: null }),

  lastDeleted: null,
  setLastDeleted: (deleted) => set({ lastDeleted: deleted }),
}));
