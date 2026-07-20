"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { formatTime, isPastDate, todayKey } from "../date-utils";
import { calendarEventsResource, habitLogsResource, habitsResource, tasksResource, waterLogsResource } from "../resources";
import type { SuggestionItem, Task } from "../types";

const WATER_GOAL_ML = 2000;
const OPEN_STATUSES: ReadonlySet<Task["status"]> = new Set(["inbox", "planned", "in_progress", "blocked"]);

function buildSuggestions(params: {
  today: string;
  nowMs: number;
  tasks: ReturnType<typeof tasksResource.useList>["data"];
  events: ReturnType<typeof calendarEventsResource.useList>["data"];
  water: ReturnType<typeof waterLogsResource.useList>["data"];
  habits: ReturnType<typeof habitsResource.useList>["data"];
  habitLogs: ReturnType<typeof habitLogsResource.useList>["data"];
}): SuggestionItem[] {
  const { today, nowMs, tasks, events, water, habits, habitLogs } = params;
  const suggestions: SuggestionItem[] = [];
  const now = new Date(nowMs);

  const openTasks = (tasks?.results ?? []).filter((t) => OPEN_STATUSES.has(t.status));

  // 1) 今天到期、預估時間短的任務優先建議先做
  const dueTodayShort = openTasks
    .filter((t) => t.dueDate === today)
    .slice()
    .sort((a, b) => (a.estimateMin ?? 999) - (b.estimateMin ?? 999))[0];
  if (dueTodayShort) {
    suggestions.push({
      id: `suggest-quick-${dueTodayShort.id}`,
      title: `先處理「${dueTodayShort.title}」`,
      reason: dueTodayShort.estimateMin
        ? `今天到期，預估 ${dueTodayShort.estimateMin} 分鐘，可以快速完成。`
        : "今天到期，建議優先處理。",
      tone: "accent",
    });
  }

  // 2) 逾期任務提醒
  const overdue = openTasks.filter((t) => isPastDate(t.dueDate));
  if (overdue.length > 0) {
    const oldest = overdue.slice().sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];
    if (oldest) {
      suggestions.push({
        id: "suggest-overdue",
        title: overdue.length === 1 ? `「${oldest.title}」已逾期` : `有 ${overdue.length} 項任務已逾期`,
        reason: `最早的一項已過期到 ${oldest.dueDate ?? "未知日期"}，建議儘快處理或重新安排期限。`,
        tone: "danger",
      });
    }
  }

  // 3) 即將開始的行程（2 小時內）
  const upcoming = (events?.results ?? [])
    .filter((e) => {
      const start = new Date(e.startAt).getTime();
      return start > nowMs && start - nowMs <= 2 * 60 * 60 * 1000;
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  if (upcoming) {
    const minutesUntil = Math.round((new Date(upcoming.startAt).getTime() - nowMs) / 60000);
    suggestions.push({
      id: `suggest-event-${upcoming.id}`,
      title: `準備「${upcoming.title}」`,
      reason: `將於 ${formatTime(upcoming.startAt)} 開始，約 ${minutesUntil} 分鐘後，記得提前準備。`,
      tone: "warning",
    });
  }

  // 4) 飲水量偏低（依現在時刻推估合理進度）
  const totalWaterMl = (water?.results ?? []).filter((w) => w.date === today).reduce((sum, w) => sum + w.amountMl, 0);
  const expectedByNowMl = Math.round(((Math.min(now.getHours(), 22) - 6) / 16) * WATER_GOAL_ML);
  if (now.getHours() >= 10 && totalWaterMl < Math.max(expectedByNowMl, 0) - 300) {
    suggestions.push({
      id: "suggest-water",
      title: "該補充水分了",
      reason: `目前累計 ${totalWaterMl} 毫升，以現在時間推估已落後目標約 ${Math.max(expectedByNowMl - totalWaterMl, 0)} 毫升。`,
      tone: "warning",
    });
  }

  // 5) 習慣尚未打卡（傍晚後提醒）
  if (now.getHours() >= 18) {
    const activeHabits = (habits?.results ?? []).filter((h) => !h.archived);
    const targetById = new Map(activeHabits.map((h) => [h.id, h.targetValue]));
    const doneTodayIds = new Set(
      (habitLogs?.results ?? [])
        .filter((l) => l.date === today && l.value >= (targetById.get(l.habitId) ?? 1))
        .map((l) => l.habitId),
    );
    const pending = activeHabits.find((h) => !doneTodayIds.has(h.id));
    if (pending) {
      suggestions.push({
        id: `suggest-habit-${pending.id}`,
        title: `別忘了「${pending.name}」`,
        reason: "已接近一天尾聲，這項習慣今天還沒有打卡紀錄。",
        tone: "accent",
      });
    }
  }

  return suggestions.slice(0, 4);
}

export function SuggestionsWidget() {
  const tasksQuery = tasksResource.useList();
  const eventsQuery = calendarEventsResource.useList();
  const waterQuery = waterLogsResource.useList();
  const habitsQuery = habitsResource.useList();
  const habitLogsQuery = habitLogsResource.useList();

  const queries = [tasksQuery, eventsQuery, waterQuery, habitsQuery, habitLogsQuery];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const [nowMs] = useState<number>(() => Date.now());

  const suggestions = isLoading || isError
    ? []
    : buildSuggestions({
        today: todayKey(),
        nowMs,
        tasks: tasksQuery.data,
        events: eventsQuery.data,
        water: waterQuery.data,
        habits: habitsQuery.data,
        habitLogs: habitLogsQuery.data,
      });

  return (
    <Card>
      <CardHeader>
        <CardTitle>系統建議</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState description="建議產生失敗。" onRetry={() => queries.forEach((q) => q.refetch())} />
        ) : suggestions.length === 0 ? (
          <EmptyState title="目前沒有特別建議" description="狀態良好，保持下去。" />
        ) : (
          <ul className="flex flex-col gap-3">
            {suggestions.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <Badge tone={s.tone}>{s.tone === "danger" ? "提醒" : s.tone === "warning" ? "注意" : "建議"}</Badge>
                  <p className="text-body text-ink">{s.title}</p>
                </div>
                <p className="text-caption text-ink-muted">{s.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
