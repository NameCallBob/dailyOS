/**
 * features/reminders/store.ts — 本模組的本地 UI 狀態（zustand）。
 * 僅存放 UI 狀態（能力偵測結果快取、測試通知進行中旗標），資料一律經 resources.ts 取得。
 */

import { create } from "zustand";

import { DEFAULT_CAPABILITIES, type ReminderCapabilities } from "./types";

interface RemindersUiState {
  capabilities: ReminderCapabilities;
  capabilitiesLoaded: boolean;
  setCapabilities: (capabilities: ReminderCapabilities) => void;

  requestingPermission: boolean;
  setRequestingPermission: (value: boolean) => void;

  sendingTest: boolean;
  setSendingTest: (value: boolean) => void;
}

export const useRemindersUiStore = create<RemindersUiState>((set) => ({
  capabilities: DEFAULT_CAPABILITIES,
  capabilitiesLoaded: false,
  setCapabilities: (capabilities) => set({ capabilities, capabilitiesLoaded: true }),

  requestingPermission: false,
  setRequestingPermission: (value) => set({ requestingPermission: value }),

  sendingTest: false,
  setSendingTest: (value) => set({ sendingTest: value }),
}));
