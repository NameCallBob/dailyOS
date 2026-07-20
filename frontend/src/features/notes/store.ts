/**
 * features/notes/store.ts — 筆記模組的本地 UI 狀態（zustand）。
 * 純 UI 狀態（選取項目、篩選、面板開關），資料一律走 repo 的 react-query hooks。
 */

import { create } from "zustand";

export type NotesView = "all" | "favorites" | "daily" | "trash";

interface NotesUiState {
  selectedNoteId: string | null;
  view: NotesView;
  filterFolder: string | null;
  filterTag: string | null;
  searchQuery: string;
  /** 手機版：是否顯示詳細（編輯器）面板，取代清單 */
  mobileDetailOpen: boolean;
  versionHistoryOpen: boolean;
  trashOpen: boolean;

  selectNote: (id: string | null) => void;
  setView: (view: NotesView) => void;
  setFilterFolder: (folder: string | null) => void;
  setFilterTag: (tag: string | null) => void;
  setSearchQuery: (q: string) => void;
  setMobileDetailOpen: (open: boolean) => void;
  setVersionHistoryOpen: (open: boolean) => void;
  setTrashOpen: (open: boolean) => void;
}

export const useNotesStore = create<NotesUiState>((set) => ({
  selectedNoteId: null,
  view: "all",
  filterFolder: null,
  filterTag: null,
  searchQuery: "",
  mobileDetailOpen: false,
  versionHistoryOpen: false,
  trashOpen: false,

  selectNote: (id) => set({ selectedNoteId: id, mobileDetailOpen: id !== null }),
  setView: (view) => set({ view, filterFolder: null, filterTag: null }),
  setFilterFolder: (folder) => set({ filterFolder: folder, view: "all" }),
  setFilterTag: (tag) => set({ filterTag: tag, view: "all" }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setMobileDetailOpen: (open) => set({ mobileDetailOpen: open }),
  setVersionHistoryOpen: (open) => set({ versionHistoryOpen: open }),
  setTrashOpen: (open) => set({ trashOpen: open }),
}));
