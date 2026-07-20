/**
 * features/sync/conflict.ts — 套用伺服器變更（pull）時的衝突判斷與處理。
 *
 * 策略對齊 docs/offline-sync.md §3：
 * - 一般資源：Last-Write-Wins，以 `updatedAt` 判斷，伺服器較新才覆蓋，本地較新則保留
 *   （等下一輪 push 把本地較新的版本送上去）。
 * - `notes`（高價值長文字）：若本地對同一筆記錄仍有「尚未送出成功」的佇列項目，且
 *   伺服器版本與本地不同，**不得無聲覆蓋** —— 寫入 `sync_conflicts`，保留兩版，
 *   交由使用者於 UI 手動選擇，不自動合併。
 * - 刪除衝突：tombstone 勝出（`deleted=true` 直接套用），但因為是軟刪除，原始欄位
 *   仍保留在記錄中，使用者之後仍可從垃圾桶還原（見 lib/resource.ts remove() 的
 *   軟刪除設計），符合「可還原」的要求。
 */

import { getDb } from "@/lib/db";
import type { BaseRecord } from "@/lib/types";
import { getSyncDb } from "./db";
import type { SyncConflictRecord, SyncServerChange } from "./types";

/** 高價值長文字資源：偵測到衝突時必須保留兩版，不自動覆蓋。 */
const MANUAL_MERGE_RESOURCES = new Set(["notes"]);

function isManualMergeResource(resource: string): boolean {
  return MANUAL_MERGE_RESOURCES.has(resource);
}

function recordsDiffer(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

async function hasQueuedMutation(resource: string, recordId: string): Promise<boolean> {
  const rows = await getSyncDb()
    .sync_mutations.where("recordId")
    .equals(recordId)
    .toArray();
  return rows.some((row) => row.resource === resource && row.status !== "synced");
}

function newConflictId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function recordConflict(
  resource: string,
  recordId: string,
  local: Record<string, unknown>,
  server: Record<string, unknown>,
): Promise<void> {
  const localVersion = typeof local.version === "number" ? local.version : 0;
  const serverVersion = typeof server.version === "number" ? server.version : 0;
  const entry: SyncConflictRecord = {
    id: newConflictId(),
    resource,
    recordId,
    localRecord: local,
    localVersion,
    serverRecord: server,
    serverVersion,
    detectedAt: new Date().toISOString(),
    resolved: false,
  };
  await getSyncDb().sync_conflicts.put(entry);
}

/**
 * 套用單筆伺服器變更到本地 Dexie。時鐘偏差一律以 `change.serverUpdatedAt`（伺服器時間）
 * 為準做比較，不使用本地裝置時鐘產生的時間戳記。
 */
export async function applyServerChange(change: SyncServerChange): Promise<void> {
  const db = getDb();
  const table = db.table<BaseRecord, string>(change.resource);
  const local = await table.get(change.recordId);

  if (change.op === "remove") {
    if (!local) return; // 本地本來就沒有這筆，無需處理
    if (local.deleted) return; // 已是刪除狀態，冪等略過
    await table.put({
      ...local,
      deleted: true,
      updatedAt: change.serverUpdatedAt,
      version: (local.version ?? 0) + 1,
    });
    return;
  }

  if (!change.record) return; // 型別上允許缺，但 create/update 理應帶 record；防禦性略過

  if (!local) {
    await table.put(change.record as unknown as BaseRecord);
    return;
  }

  if (isManualMergeResource(change.resource)) {
    const stillPending = await hasQueuedMutation(change.resource, change.recordId);
    if (stillPending && recordsDiffer(local, change.record)) {
      await recordConflict(change.resource, change.recordId, local as unknown as Record<string, unknown>, change.record);
      return; // 不覆蓋本地，等待使用者手動處理
    }
    await table.put(change.record as unknown as BaseRecord);
    return;
  }

  // 一般資源：LWW，伺服器較新才覆蓋
  if (change.serverUpdatedAt >= local.updatedAt) {
    await table.put(change.record as unknown as BaseRecord);
  }
  // 本地較新：保留本地，交由下一輪 push 送出
}

export async function listConflicts(): Promise<SyncConflictRecord[]> {
  const rows = await getSyncDb().sync_conflicts.toArray();
  return rows.filter((row) => !row.resolved);
}

export async function resolveConflict(
  id: string,
  resolution: "keep_server" | "keep_local",
): Promise<void> {
  const syncDb = getSyncDb();
  const conflict = await syncDb.sync_conflicts.get(id);
  if (!conflict) return;

  if (resolution === "keep_server") {
    const db = getDb();
    await db.table(conflict.resource).put(conflict.serverRecord);
  }
  // keep_local：本地資料本來就沒被覆蓋，不需動作；下一輪 push 會把本地版本送上去。

  await syncDb.sync_conflicts.update(id, {
    resolved: true,
    resolvedAt: new Date().toISOString(),
    resolution,
  });
}
