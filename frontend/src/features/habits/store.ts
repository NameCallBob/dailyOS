/**
 * features/habits/store.ts — 本模組的本地 UI 狀態（zustand）。
 * 僅存放 UI 狀態（篩選、表單開關、Undo 暫存），資料一律經 repo 取得。
 */

import { create } from "zustand";

import type { Habit } from "./types";

export type HabitFilter = "active" | "archived" | "all";

interface HabitsUiState {
  filter: HabitFilter;
  setFilter: (filter: HabitFilter) => void;

  formOpen: boolean;
  editingHabitId: string | null;
  openCreateForm: () => void;
  openEditForm: (habitId: string) => void;
  closeForm: () => void;

  logDialogHabitId: string | null;
  openLogDialog: (habitId: string) => void;
  closeLogDialog: () => void;

  /** 剛被刪除（軟刪除）的習慣，供 Undo 提示條使用；一段時間後自動清除。 */
  lastDeleted: Habit | null;
  setLastDeleted: (habit: Habit | null) => void;
}

export const useHabitsUiStore = create<HabitsUiState>((set) => ({
  filter: "active",
  setFilter: (filter) => set({ filter }),

  formOpen: false,
  editingHabitId: null,
  openCreateForm: () => set({ formOpen: true, editingHabitId: null }),
  openEditForm: (habitId) => set({ formOpen: true, editingHabitId: habitId }),
  closeForm: () => set({ formOpen: false, editingHabitId: null }),

  logDialogHabitId: null,
  openLogDialog: (habitId) => set({ logDialogHabitId: habitId }),
  closeLogDialog: () => set({ logDialogHabitId: null }),

  lastDeleted: null,
  setLastDeleted: (habit) => set({ lastDeleted: habit }),
}));
