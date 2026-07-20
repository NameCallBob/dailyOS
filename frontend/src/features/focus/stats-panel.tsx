"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { StatTile } from "@/components/ui/stat-tile";
import { Tabs } from "@/components/ui/tabs";

import { timeEntriesResource } from "./api";
import { formatDuration } from "./format";
import { useFocusUiStore, type StatsPeriod } from "./store";
import { aggregateByCategory, filterEntriesInRange, rangeForPeriod, sumDurationSeconds } from "./stats";
import type { TimeEntry } from "./types";

const PERIOD_TABS: Array<{ value: StatsPeriod; label: string }> = [
  { value: "day", label: "今日" },
  { value: "week", label: "本週" },
  { value: "month", label: "本月" },
];

export function StatsPanel() {
  const period = useFocusUiStore((s) => s.statsPeriod);
  const setPeriod = useFocusUiStore((s) => s.setStatsPeriod);
  const { data, isLoading, isError, refetch } = timeEntriesResource.useList({ pageSize: 500 });

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
        <CardTitle>統計</CardTitle>
        <Tabs items={PERIOD_TABS} value={period} onChange={(v) => setPeriod(v as StatsPeriod)} />
      </CardHeader>

      {isLoading ? (
        <div className="flex min-h-[120px] items-center justify-center">
          <Spinner />
        </div>
      ) : isError ? (
        <ErrorState description="無法載入統計資料，請稍後再試一次。" onRetry={() => void refetch()} />
      ) : (
        <StatsBody entries={data?.results ?? []} period={period} />
      )}
    </Card>
  );
}

function StatsBody({ entries, period }: { entries: TimeEntry[]; period: StatsPeriod }) {
  const range = rangeForPeriod(period);
  const inRange = filterEntriesInRange(entries.filter((e) => !e.deleted), range);
  const total = sumDurationSeconds(inRange);
  const byCategory = aggregateByCategory(inRange);
  const sessionCount = inRange.length;
  const pomodoroCount = inRange.filter((e) => e.category === "pomodoro").length;

  if (inRange.length === 0) {
    return <EmptyState title="此區間尚無紀錄" description="完成一次計時或補登時間後，統計會顯示在這裡。" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="總時長" value={formatDuration(total)} />
        <StatTile label="紀錄筆數" value={sessionCount} />
        <StatTile label="番茄鐘完成數" value={pomodoroCount} />
      </div>

      <div>
        <p className="mb-2 text-label uppercase text-ink-muted">分類分布</p>
        <ul className="flex flex-col gap-2">
          {byCategory.map((row) => {
            const pct = total > 0 ? Math.round((row.totalSeconds / total) * 100) : 0;
            return (
              <li key={row.category} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-caption text-ink-soft">{row.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right text-caption tabular-nums text-ink-muted">{formatDuration(row.totalSeconds)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
