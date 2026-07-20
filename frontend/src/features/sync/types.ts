/**
 * features/sync/types.ts — 同步引擎共用型別。
 *
 * 對應文件：docs/api-design.md §「/sync 端點」、docs/openapi.yaml `Sync*` schemas。
 * 僅供本機（local）模式、且使用者已登入（`getToken()` 有值）時使用；
 * trial 模式不產生佇列、auth 模式資料本來就即時打 API，兩者皆不需要同步引擎。
 */

/** 本地待同步佇列單筆的處理狀態 */
export type SyncMutationStatus = "pending" | "syncing" | "failed" | "synced";

/** 本地寫入操作種類，對應 lib/resource.ts 的 LocalWriteOp */
export type SyncOp = "create" | "update" | "remove";

/** Dexie `sync_mutations` 表的一筆記錄（待同步佇列） */
export interface SyncMutationRecord {
  /** 佇列項目主鍵（本地產生） */
  id: string;
  /** 資源名稱，對應 lib/db.ts 的表名 / REST 資源名 */
  resource: string;
  /** 操作種類 */
  op: SyncOp;
  /** 該筆記錄的 id（BaseRecord.id） */
  recordId: string;
  /** 寫入當下的完整記錄快照（remove 為 tombstone 快照）；create/update 送往後端做 upsert */
  payload: Record<string, unknown> | null;
  /** 冪等鍵：後端以此避免同一筆操作被重複套用（例如重試造成的重複送出） */
  clientMutationId: string;
  /** 佇列建立時間（ISO 8601） */
  createdAt: string;
  /** 目前狀態 */
  status: SyncMutationStatus;
  /** 已重試次數，供 backoff 計算 */
  retryCount: number;
  /** 最後一次嘗試時間（ISO 8601），未嘗試過為 undefined */
  lastAttemptAt?: string;
  /** 最後一次失敗訊息（供 UI 顯示、除錯） */
  lastError?: string;
}

/** 伺服器端變更種類（pull 回應） */
export interface SyncServerChange {
  resource: string;
  op: SyncOp;
  recordId: string;
  /** create/update 帶完整記錄；remove 可省略，只需 recordId */
  record?: Record<string, unknown>;
  /** 伺服器端時間，作為時鐘偏差校正基準 */
  serverUpdatedAt: string;
}

/** push 單筆結果 */
export type SyncPushResultStatus = "applied" | "conflict" | "rejected";

export interface SyncPushResult {
  clientMutationId: string;
  status: SyncPushResultStatus;
  /** applied 時伺服器落地後的最終記錄（可能與送出的 payload 不同，例如伺服器補齊欄位） */
  record?: Record<string, unknown>;
  /** conflict 時的衝突細節 */
  conflict?: SyncConflictInfo;
  /** rejected 時的錯誤說明 */
  error?: { code: string; message: string };
}

export type SyncConflictStrategy = "server_wins" | "manual_merge" | "tombstone_wins";

export interface SyncConflictInfo {
  strategy: SyncConflictStrategy;
  serverRecord?: Record<string, unknown>;
  serverVersion?: number;
  serverUpdatedAt?: string;
}

/** Dexie `sync_conflicts` 表：需要使用者手動處理的衝突（目前僅 notes 類資源會落到此表） */
export interface SyncConflictRecord {
  id: string;
  resource: string;
  recordId: string;
  /** 使用者本地版本（衝突當下的快照） */
  localRecord: Record<string, unknown>;
  localVersion: number;
  /** 伺服器版本 */
  serverRecord: Record<string, unknown>;
  serverVersion: number;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  /** 使用者選擇的解法（供稽核） */
  resolution?: "keep_server" | "keep_local" | "merged_manually";
}

/** 同步引擎整體狀態，供 UI 顯示 */
export interface SyncEngineStatus {
  /** 使用者是否已在設定中開啟同步（僅本機模式提供此開關） */
  enabled: boolean;
  /** 是否具備開啟同步的前提（本機模式 + 已登入） */
  eligible: boolean;
  /** 目前是否正在同步中 */
  syncing: boolean;
  /** 最後一次成功同步時間 */
  lastSyncedAt?: string;
  /** 最後一次同步錯誤訊息（push/pull 失敗時） */
  lastError?: string;
  /** 待送出（pending）筆數 */
  pendingCount: number;
  /** 失敗（failed，等待重試）筆數 */
  failedCount: number;
  /** 尚待處理的衝突筆數 */
  conflictCount: number;
  /** 下一次自動重試的預估時間（ISO），無排程則為 undefined */
  nextRetryAt?: string;
}
