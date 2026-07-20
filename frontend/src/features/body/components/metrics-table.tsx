"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";

import { bodyMetricsResource } from "../resources";
import type { BodyMetric } from "../schema";
import { formatDateLong, formatNumber } from "../utils";
import { UndoBanner } from "./undo-banner";

export interface MetricsTableProps {
  records: BodyMetric[];
  onEdit: (record: BodyMetric) => void;
}

export function MetricsTable({ records, onEdit }: MetricsTableProps) {
  const removeMutation = bodyMetricsResource.useRemove();
  const updateMutation = bodyMetricsResource.useUpdate();
  const [deleted, setDeleted] = useState<BodyMetric | null>(null);

  async function handleDelete(record: BodyMetric) {
    try {
      await removeMutation.mutateAsync(record.id);
      setDeleted(record);
      toast.info("已刪除該筆量測紀錄");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  async function handleUndo() {
    if (!deleted) return;
    try {
      await updateMutation.mutateAsync({ id: deleted.id, patch: { deleted: false } });
      toast.success("已復原該筆量測紀錄");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    } finally {
      setDeleted(null);
    }
  }

  if (records.length === 0) {
    return <EmptyState title="尚無量測紀錄" description="點選右上角「新增量測」開始記錄體重與身形數據。" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {deleted ? (
        <UndoBanner
          message={`已刪除 ${formatDateLong(deleted.date)} 的量測紀錄`}
          onUndo={handleUndo}
          onDismiss={() => setDeleted(null)}
        />
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-body">
          <thead>
            <tr className="border-b border-line text-left text-label uppercase text-ink-muted">
              <th className="py-2 pr-3 font-medium">日期</th>
              <th className="py-2 pr-3 font-medium">體重 (kg)</th>
              <th className="py-2 pr-3 font-medium">體脂率 (%)</th>
              <th className="py-2 pr-3 font-medium">腰圍 (cm)</th>
              <th className="py-2 pr-3 font-medium">來源</th>
              <th className="py-2 pr-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-line last:border-b-0">
                <td className="py-2.5 pr-3 tabular-nums text-ink">{formatDateLong(record.date)}</td>
                <td className="py-2.5 pr-3 tabular-nums text-ink">{formatNumber(record.weightKg, 1)}</td>
                <td className="py-2.5 pr-3 tabular-nums text-ink-soft">{formatNumber(record.bodyFatPercent, 1)}</td>
                <td className="py-2.5 pr-3 tabular-nums text-ink-soft">{formatNumber(record.waistCm, 1)}</td>
                <td className="py-2.5 pr-3">
                  <Badge tone={record.source === "manual" ? "neutral" : "accent"} withGlyph>
                    {record.source === "manual" ? "手動" : "裝置"}
                  </Badge>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(record)}>
                      編輯
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(record)}>
                      刪除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
