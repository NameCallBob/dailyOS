"use client";

/**
 * summary-tab.tsx — 「每週摘要」：完成率、平均不適感等唯讀彙總，並提供 CSV 匯出。
 *
 * 刻意不含任何「建議加量」或自動調整功能 —— 呈現數據，是否調整處方永遠由使用者
 * （與治療師討論後）主動決定並手動修改復健項目。
 */

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { StatTile } from "@/components/ui/stat-tile";

import { rehabExercisesResource, rehabPlansResource, rehabSessionsResource } from "../resources";
import { buildWeeklySummary, downloadCsv, formatDateLong, formatNumber, sessionsToCsv, todayIsoDate } from "../utils";
import { PlanSelect, usePlanSelection } from "./plan-select";

export function SummaryTab() {
  const plansQuery = rehabPlansResource.useList({ pageSize: 100 });
  const exercisesQuery = rehabExercisesResource.useList({ pageSize: 500 });

  const plans = useMemo(() => plansQuery.data?.results ?? [], [plansQuery.data]);
  const exercises = useMemo(() => exercisesQuery.data?.results ?? [], [exercisesQuery.data]);
  const selectedPlan = usePlanSelection(plans);

  const sessionsQuery = rehabSessionsResource.useList({
    filters: { rehabPlanId: selectedPlan?.id },
    pageSize: 1000,
  });
  const sessions = useMemo(() => sessionsQuery.data?.results ?? [], [sessionsQuery.data]);

  const weeklyRows = useMemo(() => buildWeeklySummary(sessions), [sessions]);
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const overall = useMemo(() => {
    const total = sessions.length;
    const done = sessions.filter((s) => s.done).length;
    return { total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [sessions]);

  const isLoading = plansQuery.isLoading || exercisesQuery.isLoading || (Boolean(selectedPlan) && sessionsQuery.isLoading);
  const isError = plansQuery.isError || exercisesQuery.isError || sessionsQuery.isError;

  function handleExport() {
    if (!selectedPlan) return;
    const csv = sessionsToCsv(sessions, exercisesById);
    downloadCsv(`復健紀錄_${selectedPlan.name}_${todayIsoDate()}.csv`, csv);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description="每週摘要載入失敗，請檢查連線後重試。"
        onRetry={() => {
          plansQuery.refetch();
          exercisesQuery.refetch();
          sessionsQuery.refetch();
        }}
      />
    );
  }

  if (plans.length === 0) {
    return <EmptyState title="尚無復健計畫" description="請先至「復健計畫」分頁建立計畫。" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PlanSelect plans={plans} />
        <Button type="button" variant="secondary" onClick={handleExport} disabled={!selectedPlan || sessions.length === 0}>
          匯出 CSV
        </Button>
      </div>

      {!selectedPlan ? (
        <EmptyState title="請選擇一個計畫" />
      ) : sessions.length === 0 ? (
        <EmptyState title="尚無執行紀錄" description="於「今日執行」分頁記錄後，這裡會顯示每週彙總。" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="累計執行紀錄" value={overall.total} unit="筆" />
            <StatTile label="累計完成率" value={overall.rate} unit="%" />
            <StatTile label="已完成次數" value={overall.done} unit="次" />
          </div>

          <p className="text-caption text-ink-muted">
            以下數據僅供參考，系統不會依此自動調整復健項目的組數／次數／負重；如需調整，請與治療師討論後至「復健計畫」分頁手動修改。
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-body">
              <thead>
                <tr className="border-b border-line text-left text-label uppercase text-ink-muted">
                  <th className="py-2 pr-3 font-medium">週次（起始日）</th>
                  <th className="py-2 pr-3 font-medium">紀錄筆數</th>
                  <th className="py-2 pr-3 font-medium">完成率</th>
                  <th className="py-2 pr-3 font-medium">平均不適感（前）</th>
                  <th className="py-2 pr-3 font-medium">平均不適感（後）</th>
                </tr>
              </thead>
              <tbody>
                {weeklyRows.map((row) => (
                  <tr key={row.weekKey} className="border-b border-line last:border-b-0">
                    <td className="py-2.5 pr-3 tabular-nums text-ink">{formatDateLong(row.weekStart)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink">
                      {row.doneSessions} / {row.totalSessions}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink">{row.completionRate}%</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-soft">{formatNumber(row.avgDiscomfortBefore, 1)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-soft">{formatNumber(row.avgDiscomfortAfter, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
