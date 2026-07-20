"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";

import { waterLogsResource } from "../resources";
import type { WaterLog } from "../schema";
import { formatDateLong, formatInt, formatTime } from "../utils";
import { UndoBanner } from "./undo-banner";

export interface WaterLogListProps {
  logs: WaterLog[];
}

export function WaterLogList({ logs }: WaterLogListProps) {
  const removeMutation = waterLogsResource.useRemove();
  const updateMutation = waterLogsResource.useUpdate();
  const [deleted, setDeleted] = useState<WaterLog | null>(null);

  async function handleDelete(log: WaterLog) {
    try {
      await removeMutation.mutateAsync(log.id);
      setDeleted(log);
      toast.info("已刪除該筆飲水紀錄");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  async function handleUndo() {
    if (!deleted) return;
    try {
      await updateMutation.mutateAsync({ id: deleted.id, patch: { deleted: false } });
      toast.success("已復原該筆飲水紀錄");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    } finally {
      setDeleted(null);
    }
  }

  if (logs.length === 0) {
    return <EmptyState title="尚無飲水紀錄" description="使用上方快速按鈕即可開始記錄。" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {deleted ? (
        <UndoBanner
          message={`已刪除 ${formatDateLong(deleted.date)} ${formatTime(deleted.loggedAt)} 的飲水紀錄`}
          onUndo={handleUndo}
          onDismiss={() => setDeleted(null)}
        />
      ) : null}
      <ul className="flex flex-col divide-y divide-line">
        {logs.map((log) => (
          <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex items-center gap-3">
              <span className="w-24 shrink-0 tabular-nums text-caption text-ink-muted">
                {formatDateLong(log.date)} {formatTime(log.loggedAt)}
              </span>
              <span className="tabular-nums text-body text-ink">{formatInt(log.amountMl)} mL</span>
              {log.containerLabel ? <Badge tone="neutral">{log.containerLabel}</Badge> : null}
              <Badge tone={log.source === "manual" ? "neutral" : "accent"}>{log.source === "manual" ? "手動" : "裝置"}</Badge>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(log)}>
              刪除
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
