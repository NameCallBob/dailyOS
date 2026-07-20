"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { formatDateLabel, isPastDate } from "../date-utils";
import { tasksResource } from "../resources";
import type { Task } from "../types";

const OPEN_STATUSES: ReadonlySet<Task["status"]> = new Set(["inbox", "planned", "in_progress", "blocked"]);

export function OverdueTasksWidget() {
  const { data, isLoading, isError, refetch } = tasksResource.useList();
  const update = tasksResource.useUpdate();

  const overdue = (data?.results ?? [])
    .filter((t) => OPEN_STATUSES.has(t.status) && isPastDate(t.dueDate))
    .slice()
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  return (
    <Card>
      <CardHeader>
        <CardTitle>逾期任務</CardTitle>
        {overdue.length > 0 ? <Badge tone="danger">{overdue.length} 項</Badge> : null}
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState description="任務資料載入失敗。" onRetry={() => refetch()} />
        ) : overdue.length === 0 ? (
          <EmptyState title="沒有逾期任務" description="所有任務都在期限內，做得好。" />
        ) : (
          <ul className="flex flex-col gap-3">
            {overdue.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <p className="text-body text-ink">{task.title}</p>
                  <span className="text-caption tabular-nums text-danger">已過期：{formatDateLabel(task.dueDate)}</span>
                </div>
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate({ id: task.id, patch: { status: "completed", completedAt: new Date().toISOString() } })
                  }
                  className="shrink-0 rounded-md border border-line-strong px-2.5 py-1 text-caption text-ink-soft hover:bg-paper-sunken"
                >
                  標記完成
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
