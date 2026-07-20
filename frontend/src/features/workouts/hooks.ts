/**
 * features/workouts/hooks.ts — 跨資源的複合操作：
 * - 套用範本 / 套用上次：複製來源訓練（含動作與組數）為一筆新的訓練紀錄。
 * - 另存為範本：將既有訓練標記為 isTemplate。
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { workoutExercisesResource, workoutSetsResource, workoutsResource } from "./resources";
import type { Workout } from "./schema";

export interface DuplicateWorkoutTarget {
  date: string;
  startAt: string;
  endAt?: string;
  isTemplate?: boolean;
  templateName?: string;
}

async function duplicateWorkout(sourceId: string, target: DuplicateWorkoutTarget): Promise<Workout> {
  const source = await workoutsResource.get(sourceId);

  const newWorkout = await workoutsResource.create({
    date: target.date,
    startAt: target.startAt,
    endAt: target.endAt,
    type: source.type,
    goal: source.goal,
    durationMin: source.durationMin,
    rpe: source.rpe,
    avgHr: undefined,
    calories: undefined,
    notes: undefined,
    feeling: source.feeling,
    distanceKm: source.distanceKm,
    paceMinPerKm: source.paceMinPerKm,
    avgSpeedKmh: source.avgSpeedKmh,
    steps: undefined,
    isTemplate: target.isTemplate ?? false,
    templateName: target.templateName,
  });

  const exList = await workoutExercisesResource.list({ filters: { workoutId: sourceId }, pageSize: 200, ordering: "order" });
  for (const we of exList.results) {
    const newWe = await workoutExercisesResource.create({
      workoutId: newWorkout.id,
      exerciseDefId: we.exerciseDefId,
      order: we.order,
      notes: we.notes,
    });
    const setList = await workoutSetsResource.list({ filters: { workoutExerciseId: we.id }, pageSize: 200, ordering: "order" });
    for (const s of setList.results) {
      await workoutSetsResource.create({
        workoutExerciseId: newWe.id,
        order: s.order,
        reps: s.reps,
        weightKg: s.weightKg,
        restSec: s.restSec,
        rpe: s.rpe,
        rir: s.rir,
        side: s.side,
        isWarmup: s.isWarmup,
        isWorking: s.isWorking,
        isPr: false,
      });
    }
  }

  return newWorkout;
}

export function useDuplicateWorkout() {
  const queryClient = useQueryClient();
  return useMutation<Workout, ApiRequestError, { sourceId: string; target: DuplicateWorkoutTarget }>({
    mutationFn: ({ sourceId, target }) => duplicateWorkout(sourceId, target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout_exercises"] });
      queryClient.invalidateQueries({ queryKey: ["workout_sets"] });
    },
    onError: (error) => {
      toast.error(error.message || "套用失敗，請再試一次。");
    },
  });
}

export function useSaveAsTemplate() {
  const updateMutation = workoutsResource.useUpdate();
  return async function saveAsTemplate(workoutId: string, templateName: string) {
    try {
      await updateMutation.mutateAsync({ id: workoutId, patch: { isTemplate: true, templateName } });
      toast.success("已另存為範本");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  };
}
