"use client";

/**
 * exercise-form-sheet.tsx — 新增／編輯復健項目（處方）。
 *
 * 重要：本表單是唯一能變動 sets/reps/durationSec/loadLimit/angle/frequency 等處方值的
 * 入口，且一律需要使用者主動點擊「儲存」才會送出；沒有任何自動填入的加量邏輯。
 */

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { rehabExercisesResource } from "../resources";
import type { RehabExercise } from "../schema";
import { todayIsoDate } from "../utils";

export interface ExerciseFormSheetProps {
  open: boolean;
  onClose: () => void;
  rehabPlanId: string;
  editing?: RehabExercise | null;
  nextOrder: number;
}

interface FormValues {
  name: string;
  instructions: string;
  media: string;
  sets: number | undefined;
  reps: number | undefined;
  durationSec: number | undefined;
  loadLimit: string;
  angle: string;
  cautions: string;
  frequency: string;
  therapistNote: string;
  effectiveDate: string;
  stopDate: string;
}

function toDefaultValues(editing?: RehabExercise | null): FormValues {
  if (!editing) {
    return {
      name: "",
      instructions: "",
      media: "",
      sets: undefined,
      reps: undefined,
      durationSec: undefined,
      loadLimit: "",
      angle: "",
      cautions: "",
      frequency: "",
      therapistNote: "",
      effectiveDate: todayIsoDate(),
      stopDate: "",
    };
  }
  return {
    name: editing.name,
    instructions: editing.instructions ?? "",
    media: editing.media ?? "",
    sets: editing.sets,
    reps: editing.reps,
    durationSec: editing.durationSec,
    loadLimit: editing.loadLimit ?? "",
    angle: editing.angle ?? "",
    cautions: editing.cautions ?? "",
    frequency: editing.frequency ?? "",
    therapistNote: editing.therapistNote ?? "",
    effectiveDate: editing.effectiveDate,
    stopDate: editing.stopDate ?? "",
  };
}

function numOrUndef(n: number | undefined): number | undefined {
  return n === undefined || Number.isNaN(n) ? undefined : n;
}

export function ExerciseFormSheet({ open, onClose, rehabPlanId, editing, nextOrder }: ExerciseFormSheetProps) {
  const createMutation = rehabExercisesResource.useCreate();
  const updateMutation = rehabExercisesResource.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaultValues(editing) });

  useEffect(() => {
    if (open) reset(toDefaultValues(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const payload: Partial<RehabExercise> = {
      rehabPlanId,
      name: values.name.trim(),
      instructions: values.instructions.trim() || undefined,
      media: values.media.trim() || undefined,
      sets: numOrUndef(values.sets),
      reps: numOrUndef(values.reps),
      durationSec: numOrUndef(values.durationSec),
      loadLimit: values.loadLimit.trim() || undefined,
      angle: values.angle.trim() || undefined,
      cautions: values.cautions.trim() || undefined,
      frequency: values.frequency.trim() || undefined,
      therapistNote: values.therapistNote.trim() || undefined,
      effectiveDate: values.effectiveDate,
      stopDate: values.stopDate || undefined,
      order: editing?.order ?? nextOrder,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新復健項目");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("已新增復健項目");
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) {
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          setError(field as keyof FormValues, { type: "server", message: messages[0] ?? "格式不正確" });
        }
      }
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "編輯復健項目" : "新增復健項目"}
      description="組數／次數／負重上限等處方數值僅能由此表單手動調整；系統不會自動加量。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="rehab-exercise-form" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增項目"}
          </Button>
        </>
      }
    >
      <form id="rehab-exercise-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="項目名稱" required error={errors.name?.message} {...register("name", { required: "請輸入項目名稱" })} />
        <Textarea label="動作說明" rows={3} {...register("instructions")} />
        <Input label="教學圖片／影片連結" placeholder="https://…" {...register("media")} />

        <div className="grid grid-cols-3 gap-3">
          <Input type="number" inputMode="numeric" label="組數" {...register("sets", { valueAsNumber: true })} />
          <Input type="number" inputMode="numeric" label="次數" {...register("reps", { valueAsNumber: true })} />
          <Input type="number" inputMode="numeric" label="時長（秒）" {...register("durationSec", { valueAsNumber: true })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="負重上限" placeholder="例如：≤5kg、彈力帶黃色" {...register("loadLimit")} />
          <Input label="角度限制" placeholder="例如：屈曲 0–90°" {...register("angle")} />
        </div>

        <Input label="執行頻率" placeholder="例如：每天 2 次，每週 7 天" {...register("frequency")} />
        <Textarea label="注意事項" rows={2} {...register("cautions")} />
        <Textarea label="治療師備註" rows={2} {...register("therapistNote")} />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="生效日期"
            required
            error={errors.effectiveDate?.message}
            {...register("effectiveDate", { required: "請選擇生效日期" })}
          />
          <Input type="date" label="停止日期（選填）" hint="留空代表持續執行中" {...register("stopDate")} />
        </div>
      </form>
    </Sheet>
  );
}
