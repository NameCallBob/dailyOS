"use client";

/**
 * session-log-sheet.tsx — 記錄／編輯單一項目在單一日期的實際執行狀況。
 *
 * 「實際執行值」與「處方值」是分開的欄位：本表單只寫入 rehab_sessions，
 * 絕不回寫 rehab_exercises 的處方欄位，因此使用者記錄「今天多做了幾下」
 * 不會讓系統誤以為處方本身被加量。
 */

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { rehabSessionsResource } from "../resources";
import type { RehabExercise, RehabSession } from "../schema";

export interface SessionLogSheetProps {
  open: boolean;
  onClose: () => void;
  exercise: RehabExercise;
  date: string;
  editing?: RehabSession | null;
}

interface FormValues {
  done: boolean;
  actualSets: number | undefined;
  actualReps: number | undefined;
  actualTime: number | undefined;
  discomfortBefore: number | undefined;
  discomfortAfter: number | undefined;
  load: string;
  notes: string;
}

function toDefaultValues(exercise: RehabExercise, editing?: RehabSession | null): FormValues {
  if (!editing) {
    return {
      done: true,
      actualSets: exercise.sets,
      actualReps: exercise.reps,
      actualTime: exercise.durationSec,
      discomfortBefore: undefined,
      discomfortAfter: undefined,
      load: exercise.loadLimit ?? "",
      notes: "",
    };
  }
  return {
    done: editing.done,
    actualSets: editing.actualSets,
    actualReps: editing.actualReps,
    actualTime: editing.actualTime,
    discomfortBefore: editing.discomfortBefore,
    discomfortAfter: editing.discomfortAfter,
    load: editing.load ?? "",
    notes: editing.notes ?? "",
  };
}

function numOrUndef(n: number | undefined): number | undefined {
  return n === undefined || Number.isNaN(n) ? undefined : n;
}

export function SessionLogSheet({ open, onClose, exercise, date, editing }: SessionLogSheetProps) {
  const createMutation = rehabSessionsResource.useCreate();
  const updateMutation = rehabSessionsResource.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaultValues(exercise, editing) });

  useEffect(() => {
    if (open) reset(toDefaultValues(exercise, editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, exercise.id]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const payload: Partial<RehabSession> = {
      rehabPlanId: exercise.rehabPlanId,
      rehabExerciseId: exercise.id,
      date,
      done: values.done,
      actualSets: numOrUndef(values.actualSets),
      actualReps: numOrUndef(values.actualReps),
      actualTime: numOrUndef(values.actualTime),
      discomfortBefore: numOrUndef(values.discomfortBefore),
      discomfortAfter: numOrUndef(values.discomfortAfter),
      load: values.load.trim() || undefined,
      notes: values.notes.trim() || undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success("已記錄執行狀況");
      onClose();
    } catch {
      // 失敗提示已由 resource.ts 統一顯示，這裡不再重複。
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`記錄執行：${exercise.name}`}
      description={`日期：${date}。實際完成情形僅供紀錄追蹤，不會變更此項目的處方內容。`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="rehab-session-form" loading={isSubmitting}>
            儲存紀錄
          </Button>
        </>
      }
    >
      <form id="rehab-session-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="rounded-md border border-line bg-paper-sunken px-3 py-2 text-caption text-ink-muted">
          處方：
          {exercise.sets ? `${exercise.sets} 組` : ""}
          {exercise.reps ? ` × ${exercise.reps} 下` : ""}
          {exercise.durationSec ? ` ・ ${exercise.durationSec} 秒` : ""}
          {exercise.loadLimit ? ` ・ 負重上限 ${exercise.loadLimit}` : ""}
          {!exercise.sets && !exercise.reps && !exercise.durationSec && !exercise.loadLimit ? "（未設定量化處方）" : ""}
        </div>

        <label className="flex items-center gap-2 text-body text-ink">
          <input type="checkbox" className="h-4 w-4 rounded border-line-strong" {...register("done")} />
          今日已完成此項目
        </label>

        <div className="grid grid-cols-3 gap-3">
          <Input type="number" inputMode="numeric" label="實際組數" {...register("actualSets", { valueAsNumber: true })} />
          <Input type="number" inputMode="numeric" label="實際次數" {...register("actualReps", { valueAsNumber: true })} />
          <Input type="number" inputMode="numeric" label="實際時間（秒）" {...register("actualTime", { valueAsNumber: true })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            inputMode="numeric"
            label="執行前不適感（0–10）"
            error={errors.discomfortBefore?.message}
            {...register("discomfortBefore", {
              valueAsNumber: true,
              min: { value: 0, message: "範圍為 0–10" },
              max: { value: 10, message: "範圍為 0–10" },
            })}
          />
          <Input
            type="number"
            inputMode="numeric"
            label="執行後不適感（0–10）"
            error={errors.discomfortAfter?.message}
            {...register("discomfortAfter", {
              valueAsNumber: true,
              min: { value: 0, message: "範圍為 0–10" },
              max: { value: 10, message: "範圍為 0–10" },
            })}
          />
        </div>

        <Input label="實際使用負重／阻力" placeholder="例如：3kg、彈力帶紅色" {...register("load")} />
        <Textarea label="備註" rows={2} {...register("notes")} />
      </form>
    </Sheet>
  );
}
