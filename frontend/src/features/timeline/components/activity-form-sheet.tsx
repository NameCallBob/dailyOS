"use client";

/**
 * activity-form-sheet.tsx — 新增／編輯日活動量彙總（底部抽屜表單）。
 *
 * 若同一天已存在其他來源的紀錄，顯示提醒但不阻擋送出；使用者可自行決定是否
 * 將此筆標示為「主要來源」（isPrimary），避免多來源被無聲加總。
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { todayKey } from "../date-utils";
import { activitiesResource } from "../resources";
import { ACTIVITY_SOURCE_LABEL, ACTIVITY_SOURCE_VALUES, type Activity } from "../schema";

const formSchema = z.object({
  date: z.string().min(1, "請選擇日期"),
  source: z.enum(ACTIVITY_SOURCE_VALUES),
  steps: z.coerce.number().min(0).max(200000).optional(),
  walkTimeMin: z.coerce.number().min(0).max(1440).optional(),
  distanceKm: z.coerce.number().min(0).max(500).optional(),
  standTimeMin: z.coerce.number().min(0).max(1440).optional(),
  activeMin: z.coerce.number().min(0).max(1440).optional(),
  sedentaryMin: z.coerce.number().min(0).max(1440).optional(),
  isPrimary: z.boolean(),
  notes: z.string().max(300, "備註過長").optional(),
});

type FormValues = z.infer<typeof formSchema>;

const SOURCE_OPTIONS = ACTIVITY_SOURCE_VALUES.map((value) => ({ value, label: ACTIVITY_SOURCE_LABEL[value] }));

function toDefaultValues(editing?: Activity | null): FormValues {
  if (!editing) {
    return { date: todayKey(), source: "manual", isPrimary: true, notes: "" };
  }
  return {
    date: editing.date,
    source: editing.source,
    steps: editing.steps,
    walkTimeMin: editing.walkTimeMin,
    distanceKm: editing.distanceKm,
    standTimeMin: editing.standTimeMin,
    activeMin: editing.activeMin,
    sedentaryMin: editing.sedentaryMin,
    isPrimary: editing.isPrimary,
    notes: editing.notes ?? "",
  };
}

export interface ActivityFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: Activity | null;
  /** 已存在的活動紀錄（供偵測同日多來源，僅提醒不阻擋） */
  existing: Activity[];
}

export function ActivityFormSheet({ open, onClose, editing, existing }: ActivityFormSheetProps) {
  const createMutation = activitiesResource.useCreate();
  const updateMutation = activitiesResource.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: toDefaultValues(editing) });

  useEffect(() => {
    if (open) reset(toDefaultValues(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const watchedDate = watch("date");
  const conflictingSources = useMemo(() => {
    return existing.filter((a) => a.date === watchedDate && a.id !== editing?.id).map((a) => ACTIVITY_SOURCE_LABEL[a.source]);
  }, [existing, watchedDate, editing?.id]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const occurredAt = `${values.date}T23:00:00`;
    const occurredAtIso = new Date(occurredAt).toISOString();
    const payload: Partial<Activity> = {
      type: "daily_summary",
      date: values.date,
      occurredAt: occurredAtIso,
      source: values.source,
      steps: values.steps,
      walkTimeMin: values.walkTimeMin,
      distanceKm: values.distanceKm,
      standTimeMin: values.standTimeMin,
      activeMin: values.activeMin,
      sedentaryMin: values.sedentaryMin,
      isPrimary: values.isPrimary,
      notes: values.notes?.trim() || undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新活動紀錄");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("已新增活動紀錄");
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
    <Sheet open={open} onClose={onClose} title={editing ? "編輯活動紀錄" : "新增活動紀錄"} description="步數、活動時間等每日彙總數據">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="日期" type="date" {...register("date")} error={errors.date?.message} />
          <Select label="來源" options={SOURCE_OPTIONS} {...register("source")} error={errors.source?.message} />
        </div>

        {conflictingSources.length > 0 ? (
          <p role="alert" className="rounded-md border border-warning-soft bg-warning-soft/40 px-3 py-2 text-caption text-ink-soft">
            此日期已有其他來源（{conflictingSources.join("、")}）的活動紀錄。不同來源的數字不會自動加總，請確認是否要將此筆設為「主要來源」。
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Input label="步數" type="number" min={0} {...register("steps")} error={errors.steps?.message} />
          <Input label="步行時間（分鐘）" type="number" min={0} {...register("walkTimeMin")} error={errors.walkTimeMin?.message} />
          <Input label="距離（公里）" type="number" min={0} step="0.1" {...register("distanceKm")} error={errors.distanceKm?.message} />
          <Input label="站立時間（小時）" type="number" min={0} {...register("standTimeMin")} error={errors.standTimeMin?.message} />
          <Input label="活動時間（分鐘）" type="number" min={0} {...register("activeMin")} error={errors.activeMin?.message} />
          <Input label="久坐時間（分鐘）" type="number" min={0} {...register("sedentaryMin")} error={errors.sedentaryMin?.message} />
        </div>

        <label className="flex items-center gap-2 text-body text-ink-soft">
          <input type="checkbox" className="h-4 w-4 rounded border-line-strong" {...register("isPrimary")} />
          設為此日期的主要來源（用於彙總顯示）
        </label>

        <Textarea label="備註" {...register("notes")} error={errors.notes?.message} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增紀錄"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
