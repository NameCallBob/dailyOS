"use client";

/**
 * today-tab.tsx — 「今日執行」：列出所有進行中計畫、今天在處方期間內的項目，
 * 可快速勾選完成或開啟完整紀錄表單。
 */

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { rehabExercisesResource, rehabPlansResource, rehabSessionsResource } from "../resources";
import type { RehabExercise, RehabPlan, RehabSession } from "../schema";
import { isExerciseActiveOn, sortExercisesByOrder, todayIsoDate } from "../utils";
import { DiscomfortBadge } from "./discomfort-badge";
import { SessionLogSheet } from "./session-log-sheet";

export function TodayTab() {
  const today = todayIsoDate();
  const plansQuery = rehabPlansResource.useList({ filters: { active: true }, pageSize: 100 });
  const exercisesQuery = rehabExercisesResource.useList({ pageSize: 500 });
  const sessionsQuery = rehabSessionsResource.useList({ filters: { date: today }, pageSize: 500 });

  const [sheetTarget, setSheetTarget] = useState<{ exercise: RehabExercise; session: RehabSession | null } | null>(null);
  const toggleDoneMutation = rehabSessionsResource.useUpdate();
  const createMutation = rehabSessionsResource.useCreate();

  const isLoading = plansQuery.isLoading || exercisesQuery.isLoading || sessionsQuery.isLoading;
  const isError = plansQuery.isError || exercisesQuery.isError || sessionsQuery.isError;

  const plans = useMemo(() => plansQuery.data?.results ?? [], [plansQuery.data]);
  const exercises = useMemo(() => exercisesQuery.data?.results ?? [], [exercisesQuery.data]);
  const sessions = useMemo(() => sessionsQuery.data?.results ?? [], [sessionsQuery.data]);

  const sessionByExerciseId = useMemo(() => {
    const map = new Map<string, RehabSession>();
    for (const s of sessions) map.set(s.rehabExerciseId, s);
    return map;
  }, [sessions]);

  const grouped = useMemo(() => {
    return plans
      .map((plan) => {
        const planExercises = sortExercisesByOrder(
          exercises.filter((e) => e.rehabPlanId === plan.id && isExerciseActiveOn(e, today)),
        );
        return { plan, exercises: planExercises };
      })
      .filter((g) => g.exercises.length > 0);
  }, [plans, exercises, today]);

  async function handleQuickToggle(exercise: RehabExercise, session: RehabSession | null) {
    try {
      if (session) {
        await toggleDoneMutation.mutateAsync({ id: session.id, patch: { done: !session.done } });
      } else {
        await createMutation.mutateAsync({
          rehabPlanId: exercise.rehabPlanId,
          rehabExerciseId: exercise.id,
          date: today,
          done: true,
        });
        toast.success("已記錄今日完成");
      }
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
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
        description="今日復健項目載入失敗，請檢查連線後重試。"
        onRetry={() => {
          plansQuery.refetch();
          exercisesQuery.refetch();
          sessionsQuery.refetch();
        }}
      />
    );
  }

  if (grouped.length === 0) {
    return (
      <EmptyState
        title="今天沒有排定的復健項目"
        description="可能所有計畫皆已暫停，或項目尚未到生效日期／已停止。至「復健計畫」分頁查看與管理。"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(({ plan, exercises: planExercises }) => (
        <PlanTodaySection
          key={plan.id}
          plan={plan}
          exercises={planExercises}
          sessionByExerciseId={sessionByExerciseId}
          onQuickToggle={handleQuickToggle}
          onOpenSheet={(exercise, session) => setSheetTarget({ exercise, session })}
        />
      ))}

      {sheetTarget ? (
        <SessionLogSheet
          open={Boolean(sheetTarget)}
          onClose={() => setSheetTarget(null)}
          exercise={sheetTarget.exercise}
          date={today}
          editing={sheetTarget.session}
        />
      ) : null}
    </div>
  );
}

function PlanTodaySection({
  plan,
  exercises,
  sessionByExerciseId,
  onQuickToggle,
  onOpenSheet,
}: {
  plan: RehabPlan;
  exercises: RehabExercise[];
  sessionByExerciseId: Map<string, RehabSession>;
  onQuickToggle: (exercise: RehabExercise, session: RehabSession | null) => void;
  onOpenSheet: (exercise: RehabExercise, session: RehabSession | null) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-h3 text-ink">{plan.name}</h2>
      <ul className="flex flex-col gap-3">
        {exercises.map((exercise) => {
          const session = sessionByExerciseId.get(exercise.id) ?? null;
          return (
            <li key={exercise.id} className="rounded-lg border border-line bg-paper-raised p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-medium text-ink">{exercise.name}</span>
                    {session ? (
                      <Badge tone={session.done ? "success" : "neutral"}>{session.done ? "已完成" : "尚未完成"}</Badge>
                    ) : (
                      <Badge tone="neutral">尚未記錄</Badge>
                    )}
                  </div>
                  <p className="text-caption tabular-nums text-ink-muted">
                    {exercise.sets ? `${exercise.sets} 組` : ""}
                    {exercise.reps ? ` × ${exercise.reps} 下` : ""}
                    {exercise.durationSec ? ` ・ ${exercise.durationSec} 秒` : ""}
                    {exercise.loadLimit ? ` ・ 負重上限 ${exercise.loadLimit}` : ""}
                    {exercise.angle ? ` ・ 角度 ${exercise.angle}` : ""}
                  </p>
                  {exercise.cautions ? <p className="text-caption text-warning">注意：{exercise.cautions}</p> : null}
                  {session ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      <DiscomfortBadge value={session.discomfortBefore} prefix="執行前 " />
                      <DiscomfortBadge value={session.discomfortAfter} prefix="執行後 " />
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Button type="button" variant={session?.done ? "secondary" : "primary"} size="sm" onClick={() => onQuickToggle(exercise, session)}>
                    {session?.done ? "取消完成" : "快速完成"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onOpenSheet(exercise, session)}>
                    {session ? "編輯詳細紀錄" : "填寫詳細紀錄"}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
