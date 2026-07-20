"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { StatTile } from "@/components/ui/stat-tile";
import { todayKey } from "../date-utils";
import { workoutsResource } from "../resources";

export function ActivityWidget() {
  const { data, isLoading, isError, refetch } = workoutsResource.useList();

  const today = todayKey();
  const todays = (data?.results ?? []).filter((w) => w.date === today);
  const totalMinutes = todays.reduce((sum, w) => sum + w.durationMin, 0);
  const totalCalories = todays.reduce((sum, w) => sum + (w.calories ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>今日活動量</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState description="運動紀錄載入失敗。" onRetry={() => refetch()} />
        ) : todays.length === 0 ? (
          <EmptyState title="今天還沒有運動紀錄" description="完成運動後可於「健身」模組記錄。" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="運動時間" value={totalMinutes} unit="分鐘" />
            <StatTile label="消耗熱量" value={totalCalories.toLocaleString("zh-Hant")} unit="大卡" />
            <div className="col-span-2 flex flex-wrap gap-2 pt-1">
              {todays.map((w) => (
                <span key={w.id} className="rounded-full border border-line-strong px-2.5 py-0.5 text-caption text-ink-soft">
                  {w.type} · {w.durationMin} 分鐘
                </span>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
