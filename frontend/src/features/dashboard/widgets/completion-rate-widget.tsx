"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { todayKey } from "../date-utils";
import { tasksResource } from "../resources";

export function CompletionRateWidget() {
  const { data, isLoading, isError, refetch } = tasksResource.useList();

  const dueToday = (data?.results ?? []).filter((t) => t.dueDate === todayKey() && t.status !== "cancelled");
  const done = dueToday.filter((t) => t.status === "completed").length;
  const total = dueToday.length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>今日完成率</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState description="任務資料載入失敗。" onRetry={() => refetch()} />
        ) : total === 0 ? (
          <EmptyState title="今天沒有安排任務" description="到期任務會計入完成率。" />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <span className="text-display tabular-nums text-ink">{rate}</span>
              <span className="mb-2 text-body text-ink-muted">%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={rate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="今日任務完成率"
              className="h-2 w-full overflow-hidden rounded-full bg-paper-sunken"
            >
              <div className="h-full rounded-full bg-ink transition-[width] motion-reduce:transition-none" style={{ width: `${rate}%` }} />
            </div>
            <p className="text-caption tabular-nums text-ink-muted">
              已完成 {done} / {total} 項到期任務
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
