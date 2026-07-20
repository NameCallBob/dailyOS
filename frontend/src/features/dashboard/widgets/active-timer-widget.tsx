"use client";

import { useEffect, useState } from "react";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { formatClock } from "@/features/focus/format";
import { computeElapsedSeconds } from "@/features/focus/types";
import { timerSessionsResource } from "../resources";

export function ActiveTimerWidget() {
  const { data, isLoading, isError, refetch } = timerSessionsResource.useList();
  const [nowMs, setNowMs] = useState(() => Date.now());

  const running = (data?.results ?? []).filter((t) => t.status === "running");

  useEffect(() => {
    if (running.length === 0) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>進行中計時器</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState description="計時紀錄載入失敗。" onRetry={() => refetch()} />
        ) : running.length === 0 ? (
          <EmptyState title="目前沒有計時中的項目" description="從「專注」模組開始計時後會顯示在這裡。" />
        ) : (
          <ul className="flex flex-col gap-3">
            {running.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-3">
                <p className="text-body text-ink">{session.label}</p>
                <span className="text-numeric tabular-nums text-accent">
                  {formatClock(computeElapsedSeconds(session, nowMs))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
