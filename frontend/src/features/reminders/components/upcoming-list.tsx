"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";

import { useUpcomingReminders } from "../hooks";
import { REMINDER_KIND_LABEL } from "../types";

function formatDueAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** 未來 72 小時內即將提醒的項目預覽，供使用者確認排程來源是否正確。 */
export function UpcomingList() {
  const { items, isLoading, isError, errorMessage, refetch } = useUpcomingReminders(72);

  if (isError) {
    return <ErrorState description={errorMessage ?? "讀取即將提醒的項目失敗，請稍後再試一次。"} onRetry={refetch} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="未來 3 天內沒有排定的提醒"
        description="任務的提醒時間、習慣的提醒時段、用藥排程、回診行程或飲水目標設定好之後，會顯示在這裡。"
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.slice(0, 20).map((item) => (
        <li key={item.dedupeKey} className="flex items-center justify-between gap-3 py-2.5">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body text-ink">{item.body}</span>
            <span className="text-caption text-ink-muted">{formatDueAt(item.dueAt)}</span>
          </div>
          <Badge tone="neutral" className="shrink-0">
            {REMINDER_KIND_LABEL[item.kind]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
