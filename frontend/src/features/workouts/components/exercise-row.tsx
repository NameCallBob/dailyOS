"use client";

/** exercise-row.tsx — 訓練中單一動作的組數編輯區塊。 */

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { workoutSetsResource } from "../resources";
import type { ExerciseDef, WorkoutExercise, WorkoutSet } from "../schema";
import { SetRow } from "./set-row";
import { UndoBanner } from "./undo-banner";

export interface ExerciseRowProps {
  workoutExercise: WorkoutExercise;
  exerciseDef?: ExerciseDef;
  onDeleteExercise: () => void;
}

export function ExerciseRow({ workoutExercise, exerciseDef, onDeleteExercise }: ExerciseRowProps) {
  const setsQuery = workoutSetsResource.useList({
    filters: { workoutExerciseId: workoutExercise.id },
    ordering: "order",
    pageSize: 100,
  });
  const createSet = workoutSetsResource.useCreate();
  const updateSet = workoutSetsResource.useUpdate();
  const removeSet = workoutSetsResource.useRemove();
  const [deletedSet, setDeletedSet] = useState<WorkoutSet | null>(null);

  const sets = setsQuery.data?.results ?? [];

  async function handleAddSet() {
    const last = sets[sets.length - 1];
    try {
      await createSet.mutateAsync({
        workoutExerciseId: workoutExercise.id,
        order: sets.length,
        reps: last?.reps,
        weightKg: last?.weightKg,
        restSec: last?.restSec,
        rpe: last?.rpe,
        side: last?.side,
        isWarmup: false,
        isWorking: true,
        isPr: false,
      });
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  async function handleDeleteSet(set: WorkoutSet) {
    try {
      await removeSet.mutateAsync(set.id);
      setDeletedSet(set);
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  async function handleUndoDeleteSet() {
    if (!deletedSet) return;
    try {
      await updateSet.mutateAsync({ id: deletedSet.id, patch: { deleted: false } });
      toast.success("已復原該組紀錄");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    } finally {
      setDeletedSet(null);
    }
  }

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-ink">{exerciseDef?.name ?? "未知動作"}</span>
          {exerciseDef ? <Badge tone="neutral">{exerciseDef.category}</Badge> : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDeleteExercise}>
          移除動作
        </Button>
      </div>

      {setsQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="flex flex-col">
          {sets.length > 0 ? (
            <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr_auto_auto] gap-2 px-1 text-label uppercase text-ink-muted">
              <span aria-hidden>#</span>
              <span>次數</span>
              <span>重量</span>
              <span>休息</span>
              <span>RPE</span>
              <span>側邊／狀態</span>
              <span />
            </div>
          ) : null}
          {sets.map((set, idx) => (
            <SetRow
              key={set.id}
              set={set}
              index={idx}
              onUpdate={(patch) => updateSet.mutate({ id: set.id, patch })}
              onDelete={() => handleDeleteSet(set)}
            />
          ))}
          {deletedSet ? (
            <UndoBanner message="已刪除該組紀錄" onUndo={handleUndoDeleteSet} onDismiss={() => setDeletedSet(null)} className="mt-2" />
          ) : null}
        </div>
      )}

      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={handleAddSet} loading={createSet.isPending}>
        + 新增一組
      </Button>
    </div>
  );
}
