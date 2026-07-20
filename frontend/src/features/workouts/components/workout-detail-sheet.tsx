"use client";

/** workout-detail-sheet.tsx — 訓練詳細畫面：基本資料摘要 + 動作／組數編輯（重訓／徒手／復健／自訂）。 */

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { useSaveAsTemplate } from "../hooks";
import { exerciseDefsResource, workoutExercisesResource, workoutSetsResource } from "../resources";
import type { ExerciseDef, Workout } from "../schema";
import { useWorkoutsStore } from "../store";
import { CARDIO_TYPES, FEELING_LABELS, SET_TRACKING_TYPES } from "../types";
import { formatDecimal, formatInt, formatPace, formatTime } from "../utils";
import { ExercisePickerDialog } from "./exercise-picker-dialog";
import { ExerciseRow } from "./exercise-row";

export interface WorkoutDetailSheetProps {
  workout: Workout | null;
  onClose: () => void;
  onEdit: (workout: Workout) => void;
}

export function WorkoutDetailSheet({ workout, onClose, onEdit }: WorkoutDetailSheetProps) {
  const exercisesQuery = workoutExercisesResource.useList({
    filters: { workoutId: workout?.id ?? "" },
    ordering: "order",
    pageSize: 100,
  });
  const defsQuery = exerciseDefsResource.useList({ pageSize: 200 });
  const createExercise = workoutExercisesResource.useCreate();
  const removeExercise = workoutExercisesResource.useRemove();
  const setsAllQuery = workoutSetsResource.useList({ pageSize: 1000 });
  const touchRecent = useWorkoutsStore((s) => s.touchRecentExercise);
  const saveAsTemplate = useSaveAsTemplate();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  if (!workout) return null;

  const trackSets = SET_TRACKING_TYPES.has(workout.type);
  const isCardio = CARDIO_TYPES.has(workout.type);
  const defs = defsQuery.data?.results ?? [];
  const defById = new Map(defs.map((d) => [d.id, d]));
  const exercises = exercisesQuery.data?.results ?? [];

  async function handlePick(def: ExerciseDef) {
    if (!workout) return;
    setPickerOpen(false);
    try {
      await createExercise.mutateAsync({
        workoutId: workout.id,
        exerciseDefId: def.id,
        order: exercises.length,
      });
      touchRecent(def.id);
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  async function handleRemoveExercise(exerciseId: string) {
    const setsToRemove = (setsAllQuery.data?.results ?? []).filter((s) => s.workoutExerciseId === exerciseId);
    try {
      await Promise.all(setsToRemove.map((s) => workoutSetsResource.remove(s.id)));
      await removeExercise.mutateAsync(exerciseId);
      toast.info("已移除該動作與其組數紀錄");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  function openSaveAsTemplate() {
    if (!workout) return;
    setTemplateNameDraft(workout.goal || `${workout.type}訓練範本`);
    setTemplateDialogOpen(true);
  }

  async function confirmSaveAsTemplate() {
    if (!workout) return;
    const name = templateNameDraft.trim();
    if (!name) return;
    await saveAsTemplate(workout.id, name);
    setTemplateDialogOpen(false);
  }

  return (
    <Sheet
      open={Boolean(workout)}
      onClose={onClose}
      title={`${workout.type} 訓練詳情`}
      description={`${workout.date} ${formatTime(workout.startAt)}`}
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2 rounded-lg border border-line bg-paper-sunken p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{workout.type}</Badge>
            <span className="text-caption text-ink-muted">{FEELING_LABELS[workout.feeling]}</span>
            {workout.isTemplate ? <Badge tone="warning">範本</Badge> : null}
          </div>
          {workout.goal ? <p className="text-body text-ink">{workout.goal}</p> : null}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption tabular-nums text-ink-muted sm:grid-cols-3">
            <span>時長 {formatInt(workout.durationMin)} 分</span>
            {workout.rpe !== undefined ? <span>RPE {formatDecimal(workout.rpe, 0)}</span> : null}
            {workout.avgHr !== undefined ? <span>心率 {formatInt(workout.avgHr)} bpm</span> : null}
            {workout.calories !== undefined ? <span>{formatInt(workout.calories)} kcal</span> : null}
            {isCardio && workout.distanceKm !== undefined ? <span>{formatDecimal(workout.distanceKm, 1)} 公里</span> : null}
            {isCardio && workout.paceMinPerKm !== undefined ? <span>配速 {formatPace(workout.paceMinPerKm)}/km</span> : null}
            {isCardio && workout.avgSpeedKmh !== undefined ? <span>均速 {formatDecimal(workout.avgSpeedKmh, 1)} km/h</span> : null}
            {isCardio && workout.steps !== undefined ? <span>{formatInt(workout.steps)} 步</span> : null}
          </div>
          {workout.notes ? <p className="text-caption text-ink-muted">備註：{workout.notes}</p> : null}
          <div className="mt-1 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(workout)}>
              編輯基本資料
            </Button>
            {!workout.isTemplate ? (
              <Button type="button" variant="ghost" size="sm" onClick={openSaveAsTemplate}>
                另存為範本
              </Button>
            ) : null}
          </div>
        </section>

        {trackSets ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-body font-medium text-ink">動作與組數</h3>
              <Button type="button" size="sm" onClick={() => setPickerOpen(true)}>
                + 新增動作
              </Button>
            </div>

            {exercisesQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : exercises.length === 0 ? (
              <EmptyState title="尚未新增動作" description="點選「新增動作」從動作庫挑選，開始紀錄組數。" />
            ) : (
              <div className="flex flex-col gap-3">
                {exercises.map((we) => (
                  <ExerciseRow
                    key={we.id}
                    workoutExercise={we}
                    exerciseDef={defById.get(we.exerciseDefId)}
                    onDeleteExercise={() => handleRemoveExercise(we.id)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <ExercisePickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handlePick} />

      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        title="另存為範本"
        description="範本不計入統計數據，可於「訓練紀錄」分頁快速套用建立新訓練。"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setTemplateDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={confirmSaveAsTemplate}>
              儲存範本
            </Button>
          </>
        }
      >
        <Input label="範本名稱" value={templateNameDraft} onChange={(e) => setTemplateNameDraft(e.target.value)} />
      </Dialog>
    </Sheet>
  );
}
