"use client";

/**
 * sleep-page-content.tsx — 「睡眠」模組主畫面：紀錄清單 + 趨勢與洞察兩個分頁。
 */

import { useMemo } from "react";

import { OfflineState } from "@/components/ui/error-state";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/components/pwa/use-online-status";
import { isAuth } from "@/lib/mode";

import { CORRELATION_WINDOW_DAYS, RECOMMENDED_HOURS_MAX, RECOMMENDED_HOURS_MIN, REGULARITY_WINDOW_DAYS, WEEK_WINDOW_DAYS } from "../constants";
import { useRestoreSleepLog } from "../hooks";
import { sleepLogsResource, timeEntriesReadResource, workoutsReadResource } from "../resource";
import { buildCorrelation, buildTrendSeries, computeRegularity, computeWeeklyAverage } from "../stats";
import { useSleepUiStore, type SleepTab } from "../store";
import { SleepCorrelationPanel } from "./sleep-correlation-panel";
import { SleepFormSheet } from "./sleep-form-sheet";
import { SleepLineChart } from "./sleep-line-chart";
import { SleepList } from "./sleep-list";
import { SleepRegularityCard } from "./sleep-regularity-card";
import { SleepSummaryTiles } from "./sleep-summary-tiles";
import { SleepUndoBar } from "./sleep-undo-bar";

const TAB_ITEMS: { value: SleepTab; label: string }[] = [
  { value: "logs", label: "紀錄" },
  { value: "insights", label: "趨勢與洞察" },
];

export function SleepPageContent() {
  const online = useOnlineStatus();
  const offlineBlocked = isAuth() && !online;

  const tab = useSleepUiStore((s) => s.tab);
  const setTab = useSleepUiStore((s) => s.setTab);
  const formOpen = useSleepUiStore((s) => s.formOpen);
  const editingLogId = useSleepUiStore((s) => s.editingLogId);
  const closeForm = useSleepUiStore((s) => s.closeForm);
  const openCreateForm = useSleepUiStore((s) => s.openCreateForm);
  const lastDeleted = useSleepUiStore((s) => s.lastDeleted);
  const restoreSleepLog = useRestoreSleepLog();

  const logsQuery = sleepLogsResource.useList({ pageSize: 500, ordering: "-date" });
  // 唯讀關聯資料：專注模組時間區段、運動模組紀錄；用於「睡眠與專注/運動的關聯」面板。
  const timeEntriesQuery = timeEntriesReadResource.useList({ pageSize: 1000 });
  const workoutsQuery = workoutsReadResource.useList({ pageSize: 500 });

  const logs = useMemo(() => logsQuery.data?.results ?? [], [logsQuery.data]);
  const editingLog = editingLogId ? logs.find((l) => l.id === editingLogId) ?? null : null;

  const weekly = useMemo(() => computeWeeklyAverage(logs, WEEK_WINDOW_DAYS), [logs]);
  const regularity = useMemo(() => computeRegularity(logs, REGULARITY_WINDOW_DAYS), [logs]);
  const hoursTrend = useMemo(() => buildTrendSeries(logs, 30).map((p) => ({ date: p.date, value: p.hours })), [logs]);
  const qualityTrend = useMemo(() => buildTrendSeries(logs, 30).map((p) => ({ date: p.date, value: p.quality })), [logs]);

  const correlation = useMemo(() => {
    const timeEntries = timeEntriesQuery.data?.results ?? [];
    const workouts = workoutsQuery.data?.results ?? [];
    return buildCorrelation(logs, timeEntries, workouts, CORRELATION_WINDOW_DAYS);
  }, [logs, timeEntriesQuery.data, workoutsQuery.data]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-ink">睡眠</h1>
          <p className="text-caption text-ink-muted">
            記錄上床、入睡與起床時間，追蹤每週平均、作息規律度，以及睡眠與專注、運動之間的關聯（僅供參考，非因果判定）。
          </p>
        </div>
        <Button onClick={openCreateForm}>+ 新增睡眠紀錄</Button>
      </header>

      <Tabs items={TAB_ITEMS} value={tab} onChange={(value) => setTab(value as SleepTab)} />

      {offlineBlocked ? (
        <OfflineState />
      ) : tab === "logs" ? (
        <>
          <SleepSummaryTiles weekly={weekly} />
          <SleepList logs={logs} isLoading={logsQuery.isLoading} isError={logsQuery.isError} onRetry={() => logsQuery.refetch()} />
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <SleepSummaryTiles weekly={weekly} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SleepRegularityCard regularity={regularity} windowDays={REGULARITY_WINDOW_DAYS} />
            <div className="rounded-lg border border-line bg-paper-raised p-5">
              <h3 className="mb-1 text-h3 text-ink">睡眠時數趨勢</h3>
              <p className="mb-3 text-caption text-ink-muted">
                灰底範圍為一般建議睡眠時數（{RECOMMENDED_HOURS_MIN}–{RECOMMENDED_HOURS_MAX} 小時），僅供參考，實際需求因人而異。
              </p>
              <SleepLineChart
                points={hoursTrend}
                unit="小時"
                label="睡眠時數"
                referenceRange={{ min: RECOMMENDED_HOURS_MIN, max: RECOMMENDED_HOURS_MAX }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-line bg-paper-raised p-5">
            <h3 className="mb-1 text-h3 text-ink">睡眠品質趨勢</h3>
            <p className="mb-3 text-caption text-ink-muted">自評量表 1（很差）～5（很好）。</p>
            <SleepLineChart points={qualityTrend} unit="分" label="睡眠品質" digits={0} />
          </div>
          <SleepCorrelationPanel correlation={correlation} />
        </div>
      )}

      {formOpen ? <SleepFormSheet open={formOpen} onClose={closeForm} editing={editingLog} /> : null}
      {lastDeleted ? (
        <SleepUndoBar label={`${lastDeleted.date} 的睡眠紀錄`} onUndo={() => restoreSleepLog(lastDeleted)} />
      ) : null}
    </div>
  );
}
