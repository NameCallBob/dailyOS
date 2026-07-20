"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { todayKey } from "../date-utils";
import { bodyMetricsResource, mealLogsResource, sleepLogsResource, symptomLogsResource, waterLogsResource } from "../resources";

interface StatusRow {
  label: string;
  logged: boolean;
}

export function HealthStatusWidget() {
  const water = waterLogsResource.useList();
  const sleep = sleepLogsResource.useList();
  const meals = mealLogsResource.useList();
  const body = bodyMetricsResource.useList();
  const symptoms = symptomLogsResource.useList();

  const queries = [water, sleep, meals, body, symptoms];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  const today = todayKey();
  const rows: StatusRow[] = [
    { label: "飲水", logged: (water.data?.results ?? []).some((r) => r.date === today) },
    { label: "睡眠", logged: (sleep.data?.results ?? []).some((r) => r.date === today) },
    { label: "飲食", logged: (meals.data?.results ?? []).some((r) => r.date === today) },
    { label: "體重", logged: (body.data?.results ?? []).some((r) => r.date === today) },
    { label: "症狀", logged: (symptoms.data?.results ?? []).some((r) => r.date === today) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>今日健康紀錄狀態</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState
            description="健康紀錄載入失敗。"
            onRetry={() => queries.forEach((q) => q.refetch())}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0">
                <span className="text-body text-ink">{row.label}</span>
                <Badge tone={row.logged ? "success" : "neutral"}>{row.logged ? "已記錄" : "尚未記錄"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
