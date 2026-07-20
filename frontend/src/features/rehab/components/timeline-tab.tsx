"use client";

/**
 * timeline-tab.tsx — 「回診時間線」：呈現計畫開始、回診紀錄、項目新增／停止等事件，
 * 依時間排序（最新在上）。新增回診紀錄一律由使用者主動觸發，不含任何自動調整。
 */

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";

import { rehabExercisesResource, rehabPlansResource } from "../resources";
import { buildTimeline, formatDateLong, type TimelineEvent } from "../utils";
import { PlanSelect, usePlanSelection } from "./plan-select";
import { ReviewFormDialog } from "./review-form-dialog";

const KIND_LABEL: Record<TimelineEvent["kind"], string> = {
  "plan-start": "計畫開始",
  review: "回診",
  "exercise-start": "項目新增",
  "exercise-stop": "項目停止",
};

export function TimelineTab() {
  const plansQuery = rehabPlansResource.useList({ pageSize: 100 });
  const exercisesQuery = rehabExercisesResource.useList({ pageSize: 500 });

  const plans = useMemo(() => plansQuery.data?.results ?? [], [plansQuery.data]);
  const exercises = useMemo(() => exercisesQuery.data?.results ?? [], [exercisesQuery.data]);
  const selectedPlan = usePlanSelection(plans);

  const [reviewOpen, setReviewOpen] = useState(false);

  const events = useMemo(() => {
    if (!selectedPlan) return [];
    return buildTimeline(
      selectedPlan,
      exercises.filter((e) => e.rehabPlanId === selectedPlan.id),
    );
  }, [selectedPlan, exercises]);

  const isLoading = plansQuery.isLoading || exercisesQuery.isLoading;
  const isError = plansQuery.isError || exercisesQuery.isError;

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
        description="時間線資料載入失敗，請檢查連線後重試。"
        onRetry={() => {
          plansQuery.refetch();
          exercisesQuery.refetch();
        }}
      />
    );
  }

  if (plans.length === 0) {
    return <EmptyState title="尚無復健計畫" description="請先至「復健計畫」分頁建立計畫。" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PlanSelect plans={plans} />
        {selectedPlan ? (
          <Button type="button" variant="secondary" onClick={() => setReviewOpen(true)}>
            + 新增回診紀錄
          </Button>
        ) : null}
      </div>

      {!selectedPlan ? (
        <EmptyState title="請選擇一個計畫" />
      ) : events.length === 0 ? (
        <EmptyState title="尚無時間線事件" description="新增回診紀錄或復健項目後會顯示於此。" />
      ) : (
        <ol className="flex flex-col gap-4 border-l border-line pl-5">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-ink-soft"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-caption tabular-nums text-ink-muted">{formatDateLong(event.date)}</span>
                <Badge tone={event.kind === "review" ? "accent" : "neutral"}>{KIND_LABEL[event.kind]}</Badge>
                {event.adjustment ? <Badge tone="warning">含處方調整</Badge> : null}
              </div>
              <p className="mt-1 text-body text-ink">{event.title}</p>
              {event.description ? <p className="text-caption text-ink-soft">{event.description}</p> : null}
            </li>
          ))}
        </ol>
      )}

      {selectedPlan ? <ReviewFormDialog open={reviewOpen} onClose={() => setReviewOpen(false)} plan={selectedPlan} /> : null}
    </div>
  );
}
