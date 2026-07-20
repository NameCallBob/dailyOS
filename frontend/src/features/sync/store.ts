/**
 * features/sync/store.ts — 同步引擎的即時狀態（非佇列資料本身，佇列/衝突改用
 * dexie-react-hooks 的 useLiveQuery 直接讀 Dexie，避免與這裡的狀態重複、不同步）。
 */

"use client";

import { create } from "zustand";

import { getSyncEnabled } from "./preference";

interface SyncEngineState {
  /** 使用者是否已開啟同步（鏡射 preference.ts，供元件即時反應開關） */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** 是否正在執行一次 push/pull */
  syncing: boolean;
  setSyncing: (syncing: boolean) => void;
  /** 最後一次成功同步時間（ISO） */
  lastSyncedAt: string | undefined;
  setLastSyncedAt: (iso: string | undefined) => void;
  /** 最後一次同步失敗訊息 */
  lastError: string | undefined;
  setLastError: (message: string | undefined) => void;
  /** 下一次自動重試排程時間（ISO），供 UI 顯示「將於 X 秒後重試」 */
  nextRetryAt: string | undefined;
  setNextRetryAt: (iso: string | undefined) => void;
  /** 瀏覽器目前是否偵測到有網路 */
  online: boolean;
  setOnline: (online: boolean) => void;
}

export const useSyncStore = create<SyncEngineState>((set) => ({
  enabled: getSyncEnabled(),
  setEnabled: (enabled) => set({ enabled }),
  syncing: false,
  setSyncing: (syncing) => set({ syncing }),
  lastSyncedAt: undefined,
  setLastSyncedAt: (iso) => set({ lastSyncedAt: iso }),
  lastError: undefined,
  setLastError: (message) => set({ lastError: message }),
  nextRetryAt: undefined,
  setNextRetryAt: (iso) => set({ nextRetryAt: iso }),
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  setOnline: (online) => set({ online }),
}));
