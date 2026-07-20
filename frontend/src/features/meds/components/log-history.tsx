"use client";

import { useMemo, useState } from "react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { formatDisplayDateTime } from "../date";
import { medicationLogsRepo, medicationsRepo, supplementsRepo } from "../repo";
import { LOG_STATUS_LABEL, SOURCE_TYPE_LABEL, type LogStatus, type MedicationLog } from "../types";

const STATUS_TONE: Record<LogStatus, BadgeTone> = {
  taken: "success",
  missed: "danger",
  skipped: "neutral",
};

type StatusFilter = "all" | LogStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "taken", label: "已服用" },
  { value: "missed", label: "漏服" },
  { value: "skipped", label: "略過" },
];

export function LogHistory() {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const logsQuery = medicationLogsRepo.useList({ pageSize: 500, ordering: "-scheduledFor" });
  const medsQuery = medicationsRepo.useList({ pageSize: 200 });
  const suppsQuery = supplementsRepo.useList({ pageSize: 200 });

  const isLoading = logsQuery.isLoading || medsQuery.isLoading || suppsQuery.isLoading;
  const isError = logsQuery.isError || medsQuery.isError || suppsQuery.isError;

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of medsQuery.data?.results ?? []) map.set(m.id, m.name);
    for (const s of suppsQuery.data?.results ?? []) map.set(s.id, s.name);
    return map;
  }, [medsQuery.data, suppsQuery.data]);

  const allLogs = logsQuery.data?.results ?? [];
  const visibleLogs: MedicationLog[] =
    filter === "all" ? allLogs : allLogs.filter((log) => log.status === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-paper-raised py-16 text-ink-muted">
        <Spinner /> 載入服用紀錄中…
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description="服用紀錄載入失敗，請稍後再試一次。"
        onRetry={() => {
          logsQuery.refetch();
          medsQuery.refetch();
          suppsQuery.refetch();
        }}
      />
    );
  }

  if (allLogs.length === 0) {
    return <EmptyState title="還沒有任何服用紀錄" description="從「藥物」或「保健品」分頁點擊「記錄服用」開始追蹤。" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Segmented label="篩選狀態" options={FILTER_OPTIONS} value={filter} onChange={(v) => setFilter(v as StatusFilter)} />

      {visibleLogs.length === 0 ? (
        <EmptyState title="這個篩選條件下沒有紀錄" description="切換篩選條件查看其他紀錄。" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[560px] border-collapse text-body">
            <thead>
              <tr className="border-b border-line bg-paper-sunken text-left text-label uppercase text-ink-muted">
                <th className="px-4 py-2 font-medium">時間</th>
                <th className="px-4 py-2 font-medium">項目</th>
                <th className="px-4 py-2 font-medium">來源</th>
                <th className="px-4 py-2 font-medium">狀態</th>
                <th className="px-4 py-2 font-medium">數量</th>
                <th className="px-4 py-2 font-medium">備註</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map((log) => (
                <tr key={log.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2 tabular-nums text-ink-soft">{formatDisplayDateTime(log.scheduledFor)}</td>
                  <td className="px-4 py-2 text-ink">{nameById.get(log.medicationId) ?? "（已刪除的項目）"}</td>
                  <td className="px-4 py-2 text-ink-muted">{SOURCE_TYPE_LABEL[log.sourceType]}</td>
                  <td className="px-4 py-2">
                    <Badge tone={STATUS_TONE[log.status]}>{LOG_STATUS_LABEL[log.status]}</Badge>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-ink-soft">{log.quantity ?? "—"}</td>
                  <td className="px-4 py-2 text-ink-faint">{log.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
