/**
 * features/sync/db.ts — 同步引擎自己的 Dexie 資料庫。
 *
 * 刻意**不**寫進 `lib/db.ts` 的 `DaiOSDB`：佇列／衝突／游標是同步引擎的內部簿記，
 * 不是任何 REST 資源，也不應該被匯出/匯入、重置示範資料等既有的
 * `DB_TABLE_NAMES` 全表遍歷邏輯誤觸碰。獨立資料庫也讓「清空同步佇列」
 * 這種除錯操作不會不小心波及使用者的真實資料。
 *
 * 僅在「本機（local）模式」使用；trial 模式不進佇列、auth 模式不需要本地佇列。
 */

import Dexie, { type Table } from "dexie";

import type { SyncConflictRecord, SyncMutationRecord } from "./types";

export const SYNC_DB_NAME = "DaiOSDB_sync";

interface SyncMetaRow {
  key: string;
  value: string;
}

export const SYNC_CURSOR_KEY = "cursor";
export const SYNC_LAST_SYNCED_AT_KEY = "lastSyncedAt";

class SyncEngineDb extends Dexie {
  sync_mutations!: Table<SyncMutationRecord, string>;
  sync_conflicts!: Table<SyncConflictRecord, string>;
  sync_meta!: Table<SyncMetaRow, string>;

  constructor() {
    super(SYNC_DB_NAME);
    this.version(1).stores({
      sync_mutations: "id, resource, recordId, status, createdAt, clientMutationId",
      sync_conflicts: "id, resource, recordId, detectedAt",
      sync_meta: "key",
    });
  }
}

let instance: SyncEngineDb | null = null;

/** 延遲建立單例，避免 SSR/測試環境直接觸碰 IndexedDB。 */
export function getSyncDb(): SyncEngineDb {
  if (typeof indexedDB === "undefined") {
    throw new Error("同步佇列資料庫僅可於瀏覽器環境使用");
  }
  if (!instance) {
    instance = new SyncEngineDb();
  }
  return instance;
}

export async function getSyncCursor(): Promise<string | undefined> {
  const row = await getSyncDb().sync_meta.get(SYNC_CURSOR_KEY);
  return row?.value;
}

export async function setSyncCursor(cursor: string): Promise<void> {
  await getSyncDb().sync_meta.put({ key: SYNC_CURSOR_KEY, value: cursor });
}

export async function getLastSyncedAt(): Promise<string | undefined> {
  const row = await getSyncDb().sync_meta.get(SYNC_LAST_SYNCED_AT_KEY);
  return row?.value;
}

export async function setLastSyncedAt(iso: string): Promise<void> {
  await getSyncDb().sync_meta.put({ key: SYNC_LAST_SYNCED_AT_KEY, value: iso });
}
