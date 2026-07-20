"use client";

import { Badge } from "@/components/ui/badge";
import type { SyncQueueSummary } from "../hooks";

export interface QueueStatusProps {
  queue: SyncQueueSummary;
  syncing: boolean;
  lastSyncedAt: string | undefined;
  lastError: string | undefined;
  nextRetryAt: string | undefined;
  online: boolean;
}

function formatTime(iso: string | undefined): string {
  if (!iso) return "尚未同步過";
  try {
    return new Date(iso).toLocaleString("zh-TW", { hour12: false });
  } catch {
    return iso;
  }
}

/** 佇列狀態摘要：待送出 / 失敗 / 最後同步時間，非同步中的錯誤不擋畫面，僅提示。 */
export function QueueStatus({ queue, syncing, lastSyncedAt, lastError, nextRetryAt, online }: QueueStatusProps) {
  const allSynced = queue.pendingCount === 0 && queue.failedCount === 0 && queue.syncing.length === 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-paper-sunken p-4">
      <div className="flex flex-wrap items-center gap-2">
        {!online ? (
          <Badge tone="warning">離線</Badge>
        ) : syncing ? (
          <Badge tone="accent">同步中…</Badge>
        ) : allSynced ? (
          <Badge tone="success">已全部同步</Badge>
        ) : (
          <Badge tone="neutral">待同步 {queue.pendingCount} 筆</Badge>
        )}
        {queue.failedCount > 0 ? <Badge tone="danger">失敗 {queue.failedCount} 筆</Badge> : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption text-ink-muted">
        <dt>最後同步時間</dt>
        <dd className="text-ink">{formatTime(lastSyncedAt)}</dd>
        <dt>待送出</dt>
        <dd className="text-ink">{queue.pendingCount} 筆</dd>
        <dt>同步中</dt>
        <dd className="text-ink">{queue.syncing.length} 筆</dd>
        <dt>失敗（將重試）</dt>
        <dd className="text-ink">{queue.failedCount} 筆</dd>
      </dl>

      {lastError ? (
        <p role="alert" className="text-caption text-danger">
          最近一次同步失敗：{lastError}
          {nextRetryAt ? `（將於 ${formatTime(nextRetryAt)} 自動重試）` : "（將自動重試，也可手動點擊「立即同步」）"}
        </p>
      ) : null}
    </div>
  );
}
