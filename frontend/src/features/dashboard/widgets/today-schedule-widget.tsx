"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { formatTime, isToday } from "../date-utils";
import { calendarEventsResource } from "../resources";

export function TodayScheduleWidget() {
  const { data, isLoading, isError, refetch } = calendarEventsResource.useList();

  const todayEvents = (data?.results ?? [])
    .filter((e) => isToday(e.startAt))
    .slice()
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <Card>
      <CardHeader>
        <CardTitle>今日行程</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState description="行事曆載入失敗。" onRetry={() => refetch()} />
        ) : todayEvents.length === 0 ? (
          <EmptyState title="今天沒有安排的行程" description="行事曆事件會依開始時間排序顯示於此。" />
        ) : (
          <ul className="flex flex-col gap-3">
            {todayEvents.map((event) => (
              <li key={event.id} className="flex items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                <span className="w-12 shrink-0 text-caption tabular-nums text-ink-muted">
                  {event.allDay ? "整天" : formatTime(event.startAt)}
                </span>
                <div className="flex flex-1 flex-col">
                  <p className="text-body text-ink">{event.title}</p>
                  {event.location ? <p className="text-caption text-ink-muted">{event.location}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
