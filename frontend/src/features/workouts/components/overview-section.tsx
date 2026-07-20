"use client";

import { useMemo } from "react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { StatTile } from "@/components/ui/stat-tile";

import { exerciseDefsResource, workoutExercisesResource, workoutSetsResource, workoutsResource } from "../resources";
import {
  buildRecoveryDays,
  computeCategoryDistribution,
  currentTrainingStreak,
  formatInt,
  groupByWeek,
  setVolume,
  startOfIsoWeek,
  todayIsoDate,
} from "../utils";
import { BodyPartDistribution } from "./body-part-distribution";
import { RecoveryGrid } from "./recovery-grid";
import { WeeklyTimeChart } from "./weekly-time-chart";

export function OverviewSection() {
  const workoutsQuery = workoutsResource.useList({ ordering: "-date", pageSize: 200 });
  const exercisesQuery = workoutExercisesResource.useList({ pageSize: 500 });
  const setsQuery = workoutSetsResource.useList({ pageSize: 1000 });
  const defsQuery = exerciseDefsResource.useList({ pageSize: 200 });

  const isLoading = workoutsQuery.isLoading || exercisesQuery.isLoading || setsQuery.isLoading || defsQuery.isLoading;
  const isError = workoutsQuery.isError || exercisesQuery.isError || setsQuery.isError || defsQuery.isError;

  const workouts = useMemo(() => (workoutsQuery.data?.results ?? []).filter((w) => !w.isTemplate), [workoutsQuery.data]);
  const exercises = useMemo(() => exercisesQuery.data?.results ?? [], [exercisesQuery.data]);
  const sets = useMemo(() => (setsQuery.data?.results ?? []), [setsQuery.data]);
  const defs = useMemo(() => (defsQuery.data?.results ?? []), [defsQuery.data]);

  const stats = useMemo(() => {
    const categoryByExerciseId = new Map(defs.map((d) => [d.id, d.category]));
    const workoutIdByWorkoutExerciseId = new Map(exercises.map((e) => [e.id, e.workoutId]));

    const volumeByWorkoutId = new Map<string, number>();
    for (const set of sets) {
      const workoutId = workoutIdByWorkoutExerciseId.get(set.workoutExerciseId);
      if (!workoutId) continue;
      volumeByWorkoutId.set(workoutId, (volumeByWorkoutId.get(workoutId) ?? 0) + setVolume(set));
    }

    const workoutsWithVolume = workouts.map((w) => ({ ...w, volume: volumeByWorkoutId.get(w.id) ?? 0 }));
    const weeklyStats = groupByWeek(workoutsWithVolume).slice(-8);
    const thisWeekStart = startOfIsoWeek(todayIsoDate());
    const thisWeek = weeklyStats.find((w) => w.weekStart === thisWeekStart);

    const distribution = computeCategoryDistribution(sets, exercises, categoryByExerciseId);
    const recoveryDays = buildRecoveryDays(workouts, 28);
    const streak = currentTrainingStreak(recoveryDays);

    return { weeklyStats, thisWeek, distribution, recoveryDays, streak };
  }, [workouts, exercises, sets, defs]);

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
        description="訓練統計資料載入失敗，請檢查連線後重試。"
        onRetry={() => {
          workoutsQuery.refetch();
          exercisesQuery.refetch();
          setsQuery.refetch();
          defsQuery.refetch();
        }}
      />
    );
  }

  if (workouts.length === 0) {
    return <EmptyState title="尚無訓練紀錄" description="切換到「訓練紀錄」分頁新增第一筆訓練後，統計數據會顯示在這裡。" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="本週運動時間" value={formatInt(stats.thisWeek?.totalMinutes ?? 0)} unit="分鐘" />
        <StatTile label="本週訓練容量" value={formatInt(stats.thisWeek?.totalVolume ?? 0)} unit="kg" />
        <StatTile label="本週訓練次數" value={formatInt(stats.thisWeek?.workoutCount ?? 0)} unit="次" />
        <StatTile
          label="連續訓練天數"
          value={formatInt(stats.streak)}
          unit="天"
          delta={stats.streak >= 5 ? "建議安排恢復日" : undefined}
          deltaTone={stats.streak >= 5 ? "down" : "flat"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>每週運動時間</CardTitle>
        </CardHeader>
        <WeeklyTimeChart weeks={stats.weeklyStats} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>部位分布（依訓練容量）</CardTitle>
        </CardHeader>
        <BodyPartDistribution entries={stats.distribution} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>恢復日（近 28 天）</CardTitle>
        </CardHeader>
        <RecoveryGrid days={stats.recoveryDays} />
      </Card>
    </div>
  );
}
