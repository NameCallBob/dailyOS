"use client";

/**
 * workout-form-sheet.tsx — 新增／編輯訓練基本資料（底部抽屜表單）。
 * 動作與組數編輯於 workout-detail-sheet.tsx 進行（需先有 workoutId）。
 *
 * 驗證策略：必填欄位由 react-hook-form 把關；完整數值範圍驗證交給
 * lib/resource.ts 內以 zod（workoutSchema）為準的單一事實來源，錯誤時把
 * fieldErrors 映射回表單欄位。
 */

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { workoutsResource } from "../resources";
import type { Workout } from "../schema";
import { CARDIO_TYPES, FEELING_OPTIONS, WORKOUT_TYPE_OPTIONS, type WorkoutType } from "../types";
import { combineDateTime, formatTime, todayIsoDate } from "../utils";

export interface WorkoutFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: Workout | null;
  /** 建立成功後回呼（例如導向詳細頁以新增動作）。 */
  onCreated?: (workout: Workout) => void;
}

interface FormValues {
  date: string;
  time: string;
  type: WorkoutType;
  durationMin: number;
  goal: string;
  rpe?: number;
  avgHr?: number;
  calories?: number;
  notes: string;
  feelingValue: Workout["feeling"];
  distanceKm?: number;
  paceMinPerKm?: number;
  avgSpeedKmh?: number;
  steps?: number;
  isTemplate: boolean;
  templateName: string;
}

function toDefaultValues(editing?: Workout | null): FormValues {
  if (!editing) {
    return {
      date: todayIsoDate(),
      time: formatTime(new Date().toISOString()) || "07:00",
      type: "重訓",
      durationMin: 60,
      goal: "",
      notes: "",
      feelingValue: "good",
      isTemplate: false,
      templateName: "",
    };
  }
  return {
    date: editing.date,
    time: formatTime(editing.startAt) || "07:00",
    type: editing.type,
    durationMin: editing.durationMin,
    goal: editing.goal ?? "",
    rpe: editing.rpe,
    avgHr: editing.avgHr,
    calories: editing.calories,
    notes: editing.notes ?? "",
    feelingValue: editing.feeling,
    distanceKm: editing.distanceKm,
    paceMinPerKm: editing.paceMinPerKm,
    avgSpeedKmh: editing.avgSpeedKmh,
    steps: editing.steps,
    isTemplate: editing.isTemplate,
    templateName: editing.templateName ?? "",
  };
}

function numOrUndef(n: number | undefined): number | undefined {
  return n === undefined || Number.isNaN(n) ? undefined : n;
}

export function WorkoutFormSheet({ open, onClose, editing, onCreated }: WorkoutFormSheetProps) {
  const createMutation = workoutsResource.useCreate();
  const updateMutation = workoutsResource.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaultValues(editing) });

  useEffect(() => {
    if (open) reset(toDefaultValues(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const type = watch("type");
  const isTemplate = watch("isTemplate");
  const isCardio = CARDIO_TYPES.has(type);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const startAt = combineDateTime(values.date, values.time);
    const endAt = new Date(new Date(startAt).getTime() + values.durationMin * 60_000).toISOString();

    const payload: Partial<Workout> = {
      date: values.date,
      startAt,
      endAt,
      type: values.type,
      goal: values.goal.trim() || undefined,
      durationMin: values.durationMin,
      rpe: numOrUndef(values.rpe),
      avgHr: numOrUndef(values.avgHr),
      calories: numOrUndef(values.calories),
      notes: values.notes.trim() || undefined,
      feeling: values.feelingValue,
      distanceKm: isCardio ? numOrUndef(values.distanceKm) : undefined,
      paceMinPerKm: isCardio ? numOrUndef(values.paceMinPerKm) : undefined,
      avgSpeedKmh: isCardio ? numOrUndef(values.avgSpeedKmh) : undefined,
      steps: isCardio ? numOrUndef(values.steps) : undefined,
      isTemplate: values.isTemplate,
      templateName: values.isTemplate ? values.templateName.trim() || "未命名範本" : undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新訓練紀錄");
        onClose();
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success("已新增訓練紀錄");
        onClose();
        onCreated?.(created);
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) {
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          setError(field as keyof FormValues, { type: "server", message: messages[0] ?? "格式不正確" });
        }
      }
      // 失敗提示已由 resource.ts 的 mutation onError 顯示 toast，這裡僅避免未捕捉的 rejection。
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "編輯訓練紀錄" : "新增訓練紀錄"}
      description="動作與組數請於建立後在詳細畫面中新增。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="workout-form" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增訓練"}
          </Button>
        </>
      }
    >
      <form id="workout-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="日期" required {...register("date", { required: "請選擇日期" })} error={errors.date?.message} />
          <Input type="time" label="開始時間" required {...register("time", { required: "請輸入開始時間" })} error={errors.time?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="訓練類型" options={[...WORKOUT_TYPE_OPTIONS]} required {...register("type", { required: true })} />
          <Input
            type="number"
            label="時長（分鐘）"
            required
            error={errors.durationMin?.message}
            {...register("durationMin", { required: "請輸入時長", valueAsNumber: true, min: { value: 1, message: "時長需大於 0" } })}
          />
        </div>

        <Input label="訓練目標" placeholder="例如：胸推 3x8 突破 PR" {...register("goal")} error={errors.goal?.message} />

        <div className="grid grid-cols-2 gap-3">
          <Select label="訓練感受" options={[...FEELING_OPTIONS]} required {...register("feelingValue", { required: true })} />
          <Input
            type="number"
            step={1}
            min={1}
            max={10}
            label="RPE（自覺強度 1–10）"
            {...register("rpe", { valueAsNumber: true })}
            error={errors.rpe?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input type="number" label="平均心率（bpm）" {...register("avgHr", { valueAsNumber: true })} error={errors.avgHr?.message} />
          <Input type="number" label="消耗熱量（kcal）" {...register("calories", { valueAsNumber: true })} error={errors.calories?.message} />
        </div>

        {isCardio ? (
          <fieldset className="flex flex-col gap-3 rounded-md border border-line p-3">
            <legend className="px-1 text-label uppercase text-ink-muted">有氧數據</legend>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" step={0.1} label="距離（公里）" {...register("distanceKm", { valueAsNumber: true })} />
              <Input type="number" step={0.05} label="配速（分/公里）" {...register("paceMinPerKm", { valueAsNumber: true })} />
              <Input type="number" step={0.1} label="均速（km/h）" {...register("avgSpeedKmh", { valueAsNumber: true })} />
              <Input type="number" label="步數" {...register("steps", { valueAsNumber: true })} />
            </div>
          </fieldset>
        ) : null}

        <Textarea label="備註" placeholder="狀態、環境、傷痛等補充說明（選填）" {...register("notes")} error={errors.notes?.message} />

        <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
          <label className="flex items-center gap-2 text-body text-ink">
            <input type="checkbox" className="h-4 w-4" {...register("isTemplate")} />
            設為運動範本（不計入統計，可於「訓練紀錄」快速套用）
          </label>
          {isTemplate ? (
            <Input label="範本名稱" placeholder="例如：上肢推力訓練範本" {...register("templateName")} />
          ) : null}
        </fieldset>
      </form>
    </Sheet>
  );
}
