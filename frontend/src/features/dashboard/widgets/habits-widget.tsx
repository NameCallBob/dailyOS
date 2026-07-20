"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { nowIso } from "@/lib/resource";
import { todayKey } from "../date-utils";
import { habitLogsResource, habitsResource } from "../resources";
import type { Habit, HabitLog } from "../types";

export function HabitsWidget() {
  const habitsQuery = habitsResource.useList();
  const logsQuery = habitLogsResource.useList();
  const createLog = habitLogsResource.useCreate();
  const updateLog = habitLogsResource.useUpdate();

  const isLoading = habitsQuery.isLoading || logsQuery.isLoading;
  const isError = habitsQuery.isError || logsQuery.isError;

  const today = todayKey();
  const activeHabits = (habitsQuery.data?.results ?? []).filter((h) => !h.archived);
  const logsToday = new Map<string, HabitLog>();
  for (const log of logsQuery.data?.results ?? []) {
    if (log.date === today) logsToday.set(log.habitId, log);
  }

  function isDone(habit: Habit): boolean {
    const value = logsToday.get(habit.id)?.value ?? 0;
    return value >= habit.targetValue;
  }

  function toggle(habit: Habit) {
    const existing = logsToday.get(habit.id);
    const done = isDone(habit);
    if (existing) {
      updateLog.mutate({ id: existing.id, patch: { value: done ? 0 : habit.targetValue } });
      return;
    }
    createLog.mutate(
      { habitId: habit.id, date: today, value: habit.targetValue, loggedAt: nowIso() },
      {
        onError: () => toast.error("習慣打卡失敗，請再試一次。"),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>今日習慣</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState
            description="習慣資料載入失敗。"
            onRetry={() => {
              habitsQuery.refetch();
              logsQuery.refetch();
            }}
          />
        ) : activeHabits.length === 0 ? (
          <EmptyState title="尚未建立任何習慣" description="到「習慣」模組新增第一個習慣吧。" />
        ) : (
          <ul className="flex flex-col gap-2">
            {activeHabits.map((habit) => {
              const done = isDone(habit);
              return (
                <li key={habit.id} className="flex items-center justify-between gap-3">
                  <span className="text-body text-ink">{habit.name}</span>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`${habit.name}：${done ? "今天已完成" : "標記為今天已完成"}`}
                    onClick={() => toggle(habit)}
                    disabled={createLog.isPending || updateLog.isPending}
                    className={
                      done
                        ? "flex h-7 w-7 items-center justify-center rounded-full border border-ink bg-ink text-paper"
                        : "flex h-7 w-7 items-center justify-center rounded-full border border-line-strong text-transparent hover:border-ink"
                    }
                  >
                    ✓
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
