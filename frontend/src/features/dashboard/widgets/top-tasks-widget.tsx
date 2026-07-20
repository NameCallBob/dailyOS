"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { todayKey } from "../date-utils";
import { tasksResource } from "../resources";
import type { Task } from "../types";

const OPEN_STATUSES: ReadonlySet<Task["status"]> = new Set(["inbox", "planned", "in_progress", "blocked"]);

const PRIORITY_WEIGHT: Record<Task["priority"], number> = { urgent: 0, high: 1, med: 2, low: 3 };
const PRIORITY_LABEL: Record<Task["priority"], string> = { urgent: "急", high: "高", med: "中", low: "低" };
const PRIORITY_TONE: Record<Task["priority"], "danger" | "warning" | "neutral"> = {
  urgent: "danger",
  high: "danger",
  med: "warning",
  low: "neutral",
};

function pickTopThree(tasks: Task[]): Task[] {
  const today = todayKey();
  const open = tasks.filter((t) => OPEN_STATUSES.has(t.status));
  return open
    .slice()
    .sort((a, b) => {
      const aToday = a.dueDate === today ? 0 : 1;
      const bToday = b.dueDate === today ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;
      const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (pw !== 0) return pw;
      return (a.estimateMin ?? 999) - (b.estimateMin ?? 999);
    })
    .slice(0, 3);
}

export function TopTasksWidget() {
  const { data, isLoading, isError, refetch } = tasksResource.useList();
  const update = tasksResource.useUpdate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>今日最重要三件事</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState description="任務資料載入失敗。" onRetry={() => refetch()} />
        ) : (
          (() => {
            const top = pickTopThree(data?.results ?? []);
            if (top.length === 0) {
              return <EmptyState title="今天沒有待辦重點" description="新增任務後會出現在這裡。" />;
            }
            return (
              <ol className="flex flex-col gap-3">
                {top.map((task, index) => (
                  <li key={task.id} className="flex items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                    <button
                      type="button"
                      aria-label={`將「${task.title}」標記為已完成`}
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ id: task.id, patch: { status: "completed", completedAt: new Date().toISOString() } })
                      }
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-label text-ink-muted hover:border-ink hover:text-ink"
                    >
                      {index + 1}
                    </button>
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="text-body text-ink">{task.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={PRIORITY_TONE[task.priority]}>優先度：{PRIORITY_LABEL[task.priority]}</Badge>
                        {task.estimateMin ? (
                          <span className="text-caption tabular-nums text-ink-muted">預估 {task.estimateMin} 分鐘</span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            );
          })()
        )}
      </CardBody>
    </Card>
  );
}
