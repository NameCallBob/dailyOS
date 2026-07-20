/**
 * features/sync/api.ts — `/api/v1/sync/` push/pull HTTP 呼叫。
 *
 * 端點形狀精確對應 docs/api-design.md「6. /sync 端點」與 docs/openapi.yaml
 * 的 `SyncPushRequest` / `SyncPushResponse` / `SyncPullResponse`。
 * 後端目前尚未實作：呼叫必定以 `network_error`（見 lib/http.ts）失敗，
 * 呼叫端（engine.ts）必須妥善處理，不得讓例外往上炸穿。
 */

import { http } from "@/lib/http";
import type { SyncMutationRecord, SyncOp, SyncPushResult, SyncServerChange } from "./types";

const SYNC_BASE = "/api/v1/sync/";

export interface SyncPushMutationInput {
  clientMutationId: string;
  resource: string;
  op: SyncOp;
  recordId: string;
  payload: Record<string, unknown> | null;
  /** 送出當下用戶端記錄的 updatedAt，供後端做 LWW／版本比對 */
  clientUpdatedAt: string | null;
}

export interface SyncPushRequest {
  mutations: SyncPushMutationInput[];
}

export interface SyncPushResponse {
  results: SyncPushResult[];
  /** 推送完成後的最新游標；下一次 pull 應帶此值 */
  cursor: string;
}

export interface SyncPullResponse {
  changes: SyncServerChange[];
  cursor: string;
  hasMore: boolean;
}

function toMutationInput(row: SyncMutationRecord): SyncPushMutationInput {
  const updatedAt = row.payload && typeof row.payload.updatedAt === "string" ? row.payload.updatedAt : null;
  return {
    clientMutationId: row.clientMutationId,
    resource: row.resource,
    op: row.op,
    recordId: row.recordId,
    payload: row.op === "remove" ? row.payload : row.payload,
    clientUpdatedAt: updatedAt,
  };
}

export async function pushMutations(rows: SyncMutationRecord[]): Promise<SyncPushResponse> {
  const body: SyncPushRequest = { mutations: rows.map(toMutationInput) };
  return http.post<SyncPushResponse>(SYNC_BASE, body);
}

export async function pullChanges(since: string | undefined): Promise<SyncPullResponse> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  return http.get<SyncPullResponse>(`${SYNC_BASE}${qs}`);
}
