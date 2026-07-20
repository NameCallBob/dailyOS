"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { StatTile } from "@/components/ui/stat-tile";
import { todayKey } from "../date-utils";
import { waterLogsResource } from "../resources";

const DAILY_GOAL_ML = 2000;

export function WaterWidget() {
  const { data, isLoading, isError, refetch } = waterLogsResource.useList();

  const today = todayKey();
  const totalMl = (data?.results ?? []).filter((w) => w.date === today).reduce((sum, w) => sum + w.amountMl, 0);
  const pct = Math.min(100, Math.round((totalMl / DAILY_GOAL_ML) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle>今日飲水</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState description="飲水紀錄載入失敗。" onRetry={() => refetch()} />
        ) : (
          <div className="flex flex-col gap-3">
            <StatTile label="累計飲水量" value={totalMl.toLocaleString("zh-Hant")} unit="毫升" />
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="今日飲水達成率"
              className="h-2 w-full overflow-hidden rounded-full bg-paper-sunken"
            >
              <div className="h-full rounded-full bg-accent transition-[width] motion-reduce:transition-none" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-caption tabular-nums text-ink-muted">
              目標 {DAILY_GOAL_ML.toLocaleString("zh-Hant")} 毫升，已達成 {pct}%
              {totalMl === 0 ? "，還沒有紀錄，喝口水吧" : ""}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
