/**
 * features/sync/hooks.ts — 元件用的即時資料 hooks。
 * 佇列／衝突筆數直接用 dexie-react-hooks 的 useLiveQuery 訂閱 Dexie，
 * 確保 push/pull 背景更新後 UI 自動反映，不需要另外手動廣播事件。
 */

"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { getToken, isLocal } from "@/lib/mode";
import { getSyncDb } from "./db";
import type { SyncConflictRecord, SyncMutationRecord } from "./types";

export interface SyncQueueSummary {
  pending: SyncMutationRecord[];
  syncing: SyncMutationRecord[];
  failed: SyncMutationRecord[];
  pendingCount: number;
  failedCount: number;
}

const EMPTY_QUEUE: SyncQueueSummary = {
  pending: [],
  syncing: [],
  failed: [],
  pendingCount: 0,
  failedCount: 0,
};

/** 目前是否具備使用同步的前提條件（本機模式 + 已登入）。與是否「已開啟」無關。 */
export function useSyncEligibility(): { isLocalMode: boolean; isLoggedIn: boolean } {
  return {
    isLocalMode: isLocal(),
    isLoggedIn: Boolean(getToken()),
  };
}

export function useSyncQueue(): SyncQueueSummary | undefined {
  return useLiveQuery(async () => {
    if (typeof indexedDB === "undefined" || !isLocal()) return EMPTY_QUEUE;
    const rows = await getSyncDb().sync_mutations.orderBy("createdAt").toArray();
    const pending = rows.filter((row) => row.status === "pending");
    const syncing = rows.filter((row) => row.status === "syncing");
    const failed = rows.filter((row) => row.status === "failed");
    return {
      pending,
      syncing,
      failed,
      pendingCount: pending.length,
      failedCount: failed.length,
    };
  }, []);
}

export function useSyncConflicts(): SyncConflictRecord[] | undefined {
  return useLiveQuery(async () => {
    if (typeof indexedDB === "undefined" || !isLocal()) return [];
    const rows = await getSyncDb().sync_conflicts.toArray();
    return rows.filter((row) => !row.resolved);
  }, []);
}
