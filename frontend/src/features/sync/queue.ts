/**
 * features/sync/queue.ts — 待同步佇列（Dexie `sync_mutations`）的讀寫操作。
 */

import { getDb } from "@/lib/db";
import { getToken, isLocal } from "@/lib/mode";
import type { LocalWriteOp } from "@/lib/resource";
import { getSyncDb } from "./db";
import { getSyncEnabled } from "./preference";
import type { SyncMutationRecord, SyncOp } from "./types";

function newQueueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** 是否應該把本地寫入排入同步佇列：本機模式 + 使用者已開啟同步 + 已登入。 */
export function shouldQueueWrites(): boolean {
  return isLocal() && getSyncEnabled() && Boolean(getToken());
}

/**
 * 供 `registerLocalWriteObserver` 呼叫：讀取寫入後的最新記錄快照並排入佇列。
 * 讀取快照（而非只存 id）是因為 push 時需要完整 payload；observer 只給
 * `(name, op, id)`，且此時 Dexie 寫入已完成，`table.get(id)` 讀到的即是最終狀態。
 */
export async function enqueueLocalWrite(resource: string, op: LocalWriteOp, recordId: string): Promise<void> {
  if (!shouldQueueWrites()) return;
  let payload: Record<string, unknown> | null = null;
  try {
    const db = getDb();
    const record = await db.table(resource).get(recordId);
    payload = (record as Record<string, unknown> | undefined) ?? null;
  } catch {
    // 讀取快照失敗不應該讓寫入流程失敗；改用 null payload，push 時再嘗試補讀。
    payload = null;
  }

  const entry: SyncMutationRecord = {
    id: newQueueId(),
    resource,
    op: op as SyncOp,
    recordId,
    payload,
    clientMutationId: newQueueId(),
    createdAt: new Date().toISOString(),
    status: "pending",
    retryCount: 0,
  };
  await getSyncDb().sync_mutations.put(entry);
}

export async function listQueue(): Promise<SyncMutationRecord[]> {
  return getSyncDb().sync_mutations.orderBy("createdAt").toArray();
}

export async function listPending(): Promise<SyncMutationRecord[]> {
  const rows = await getSyncDb().sync_mutations.toArray();
  return rows.filter((row) => row.status === "pending" || row.status === "failed");
}

export async function markSyncing(ids: string[]): Promise<void> {
  const db = getSyncDb();
  await db.transaction("rw", db.sync_mutations, async () => {
    for (const id of ids) {
      await db.sync_mutations.update(id, { status: "syncing" });
    }
  });
}

export async function markSynced(id: string): Promise<void> {
  // 已成功同步的項目不需要在佇列裡永久保留；直接移除，UI 的「已同步」計數改由
  // lastSyncedAt + 佇列清空後的瞬間狀態呈現，避免佇列表無限增長。
  await getSyncDb().sync_mutations.delete(id);
}

export async function markFailed(id: string, message: string): Promise<void> {
  const db = getSyncDb();
  const existing = await db.sync_mutations.get(id);
  const retryCount = (existing?.retryCount ?? 0) + 1;
  await db.sync_mutations.update(id, {
    status: "failed",
    retryCount,
    lastAttemptAt: new Date().toISOString(),
    lastError: message,
  });
}

export async function markPendingAgain(ids: string[]): Promise<void> {
  const db = getSyncDb();
  await db.transaction("rw", db.sync_mutations, async () => {
    for (const id of ids) {
      await db.sync_mutations.update(id, { status: "pending" });
    }
  });
}

export async function clearQueue(): Promise<void> {
  await getSyncDb().sync_mutations.clear();
}
