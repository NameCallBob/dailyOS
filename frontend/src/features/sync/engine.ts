/**
 * features/sync/engine.ts — 同步引擎主流程：push 佇列、pull 伺服器變更、重試排程。
 *
 * 後端 `/api/v1/sync/` 目前尚未實作（見 docs/api-design.md §6），因此每次呼叫
 * 幾乎必定得到 `network_error`；本檔案的所有錯誤處理路徑都必須把失敗妥善記錄成
 * `failed` 狀態並排程重試，不得丟出未捕捉例外、不得讓 UI 卡死或白屏。
 */

import { getToken, isLocal } from "@/lib/mode";
import { registerLocalWriteObserver } from "@/lib/resource";
import { pullChanges as apiPullChanges, pushMutations as apiPushMutations } from "./api";
import { applyServerChange } from "./conflict";
import { getSyncCursor, setLastSyncedAt as persistLastSyncedAt, setSyncCursor } from "./db";
import { getSyncEnabled, setSyncEnabled } from "./preference";
import { enqueueLocalWrite, listPending, markFailed, markSyncing, markSynced } from "./queue";
import { useSyncStore } from "./store";
import type { SyncMutationRecord } from "./types";

const MIN_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const AUTO_SYNC_INTERVAL_MS = 60_000;
/** pull 分頁 replay 上限，避免尚未實作的後端回傳異常資料造成無窮迴圈。 */
const MAX_PULL_PAGES = 20;

function computeBackoffMs(retryCount: number): number {
  const raw = MIN_BACKOFF_MS * 2 ** Math.max(0, retryCount - 1);
  const capped = Math.min(raw, MAX_BACKOFF_MS);
  const jitter = capped * (0.85 + Math.random() * 0.3);
  return Math.round(jitter);
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "發生未預期的錯誤";
}

/** 是否具備執行同步的前提：本機模式、已登入、使用者已開啟同步。 */
export function isSyncEligible(): boolean {
  return isLocal() && getSyncEnabled() && Boolean(getToken());
}

async function pushQueue(): Promise<{ ok: boolean; error?: string }> {
  const pending = await listPending();
  if (pending.length === 0) return { ok: true };

  await markSyncing(pending.map((row) => row.id));

  let response: Awaited<ReturnType<typeof apiPushMutations>>;
  try {
    response = await apiPushMutations(pending);
  } catch (err) {
    const message = toErrorMessage(err);
    for (const row of pending) {
      await markFailed(row.id, message);
    }
    return { ok: false, error: message };
  }

  const byId = new Map<string, SyncMutationRecord>(pending.map((row) => [row.clientMutationId, row]));
  for (const result of response.results) {
    const row = byId.get(result.clientMutationId);
    if (!row) continue;
    if (result.status === "applied") {
      await markSynced(row.id);
    } else if (result.status === "conflict") {
      // 一般資源：伺服器版本已在 conflict.serverRecord，交由下一次 pull 自然套用（server-wins）；
      // 這裡先把佇列項目視為已處理，避免無限重推同一筆已被拒絕的舊版本。
      await markSynced(row.id);
    } else {
      await markFailed(row.id, result.error?.message ?? "伺服器拒絕此筆同步");
    }
  }
  return { ok: true };
}

async function pullServerChanges(): Promise<{ ok: boolean; error?: string }> {
  let cursor = await getSyncCursor();
  let pages = 0;
  try {
    for (;;) {
      const response = await apiPullChanges(cursor);
      for (const change of response.changes) {
        await applyServerChange(change);
      }
      cursor = response.cursor;
      await setSyncCursor(cursor);
      pages += 1;
      if (!response.hasMore || pages >= MAX_PULL_PAGES) break;
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toErrorMessage(err) };
  }
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;

function clearRetryTimer(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  useSyncStore.getState().setNextRetryAt(undefined);
}

function scheduleRetry(retryCount: number): void {
  clearRetryTimer();
  const delay = computeBackoffMs(retryCount);
  const nextAt = new Date(Date.now() + delay).toISOString();
  useSyncStore.getState().setNextRetryAt(nextAt);
  retryTimer = setTimeout(() => {
    void triggerSync();
  }, delay);
}

/**
 * 手動或自動觸發一次完整同步（push 佇列 → pull 伺服器變更）。
 * 永遠不會拋出例外：所有失敗都反映在 `useSyncStore` 的 `lastError` / 佇列狀態上。
 */
export async function triggerSync(): Promise<void> {
  if (!isSyncEligible()) return;
  if (syncInFlight) return syncInFlight;

  const store = useSyncStore.getState();
  store.setSyncing(true);
  store.setLastError(undefined);

  syncInFlight = (async () => {
    const pushResult = await pushQueue();
    const pullResult = await pullServerChanges();

    const ok = pushResult.ok && pullResult.ok;
    if (ok) {
      const now = new Date().toISOString();
      await persistLastSyncedAt(now);
      useSyncStore.getState().setLastSyncedAt(now);
      clearRetryTimer();
    } else {
      const message = pushResult.error ?? pullResult.error ?? "同步失敗";
      useSyncStore.getState().setLastError(message);
      const pending = await listPending();
      const maxRetry = pending.reduce((max, row) => Math.max(max, row.retryCount), 1);
      scheduleRetry(maxRetry);
    }
    useSyncStore.getState().setSyncing(false);
  })();

  try {
    await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

/** 使用者於 UI 切換同步開關：更新偏好設定、鏡射到 store，開啟時立即嘗試同步一次。 */
export function setSyncPreference(enabled: boolean): void {
  setSyncEnabled(enabled);
  useSyncStore.getState().setEnabled(enabled);
  if (enabled) {
    void triggerSync();
  } else {
    clearRetryTimer();
  }
}

/**
 * 掛載同步引擎：登記本地寫入觀察者、監聽連線狀態、定期自動同步。
 * 僅在本機模式下生效；trial／auth 模式呼叫此函式為 no-op。
 * 回傳 cleanup 函式供 App Shell 於卸載時呼叫。
 */
export function initSync(): () => void {
  if (typeof window === "undefined" || !isLocal()) {
    return () => {};
  }

  const unregisterObserver = registerLocalWriteObserver((name, op, id) => {
    void enqueueLocalWrite(name, op, id);
  });

  function handleOnline() {
    useSyncStore.getState().setOnline(true);
    void triggerSync();
  }
  function handleOffline() {
    useSyncStore.getState().setOnline(false);
  }
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  const interval = window.setInterval(() => {
    void triggerSync();
  }, AUTO_SYNC_INTERVAL_MS);

  // 啟動時若已開啟同步，立即跑一次。
  void triggerSync();

  return () => {
    unregisterObserver();
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    window.clearInterval(interval);
    clearRetryTimer();
  };
}
