"use client";

import { useMemo, useState } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";

import { waterLogsResource } from "../resources";
import { useWaterPrefs } from "../water-store";
import { daysAgoIso, sortByLoggedAtDesc, sumWaterByDate, todayIsoDate } from "../utils";
import { WaterBarChart, type WaterBarChartDay } from "./water-bar-chart";
import { WaterLogList } from "./water-log-list";
import { WaterSettingsDialog } from "./water-settings-dialog";
import { WaterWidget } from "./water-widget";

const TREND_DAYS = 14;

export function WaterSection() {
  const listQuery = waterLogsResource.useList({ ordering: "-loggedAt", pageSize: 300 });
  const { dailyGoalMl } = useWaterPrefs();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const logs = useMemo(() => listQuery.data?.results ?? [], [listQuery.data]);

  const todayTotalMl = useMemo(() => {
    const today = todayIsoDate();
    return logs.filter((l) => l.date === today).reduce((sum, l) => sum + l.amountMl, 0);
  }, [logs]);

  const trendDays = useMemo<WaterBarChartDay[]>(() => {
    const totals = sumWaterByDate(logs);
    const days: WaterBarChartDay[] = [];
    for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
      const date = daysAgoIso(i);
      const totalMl = totals.get(date) ?? 0;
      days.push({ date, totalMl, hasLog: totals.has(date) });
    }
    return days;
  }, [logs]);

  const recentLogs = useMemo(() => sortByLoggedAtDesc(logs).slice(0, 40), [logs]);

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (listQuery.isError) {
    return <ErrorState onRetry={() => listQuery.refetch()} description="飲水資料載入失敗，請檢查連線後重試。" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <WaterWidget todayTotalMl={todayTotalMl} onManageSettings={() => setSettingsOpen(true)} />

      <section className="rounded-lg border border-line bg-paper-raised p-4">
        <h3 className="mb-3 text-body font-medium text-ink">近 14 天飲水趨勢</h3>
        <WaterBarChart days={trendDays} goalMl={dailyGoalMl} />
      </section>

      <section>
        <h3 className="mb-3 text-body font-medium text-ink">飲水紀錄</h3>
        <WaterLogList logs={recentLogs} />
      </section>

      <WaterSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
