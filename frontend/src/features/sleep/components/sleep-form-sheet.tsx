"use client";

/**
 * sleep-form-sheet.tsx — 新增／編輯睡眠紀錄（底部抽屜表單）。
 *
 * 使用者只需填寫「起床日」與三個時:分欄位（上床／入睡／起床），
 * 上床與入睡時間會依 resolveNightTimestamp() 自動判斷是否歸屬前一晚，
 * 睡眠時數（hours）則於送出前自動推導，不開放使用者直接編輯，避免與實際時間不一致。
 *
 * 驗證策略：必填欄位由 react-hook-form 把關；完整規則交給 lib/resource.ts 內以
 * zod（sleepLogSchema）為準的單一事實來源，錯誤時把 fieldErrors 映射回表單欄位。
 */

import { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { ENERGY_OPTIONS, QUALITY_OPTIONS } from "../constants";
import { sleepLogsResource } from "../resource";
import { PRE_SLEEP_ACTIVITY_OPTIONS, type PreSleepActivity, type SleepLog } from "../schema";
import { computeHours, formatNumber, formatTime, resolveNightTimestamp, todayIsoDate } from "../utils";

export interface SleepFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: SleepLog | null;
}

interface FormValues {
  date: string;
  bedTime: string;
  sleepTime: string;
  wakeTime: string;
  awakenings: number;
  quality: string;
  morningEnergy: string;
  preSleepActivity: PreSleepActivity;
  notes: string;
}

function toDefaultValues(editing?: SleepLog | null): FormValues {
  if (!editing) {
    return {
      date: todayIsoDate(),
      bedTime: "23:00",
      sleepTime: "23:20",
      wakeTime: "07:00",
      awakenings: 0,
      quality: "3",
      morningEnergy: "3",
      preSleepActivity: "none",
      notes: "",
    };
  }
  return {
    date: editing.date,
    bedTime: formatTime(editing.bedtime) || "23:00",
    sleepTime: formatTime(editing.sleepAt) || "23:20",
    wakeTime: formatTime(editing.wakeAt) || "07:00",
    awakenings: editing.awakenings,
    quality: String(editing.quality),
    morningEnergy: String(editing.morningEnergy),
    preSleepActivity: editing.preSleepActivity,
    notes: editing.notes ?? "",
  };
}

export function SleepFormSheet({ open, onClose, editing }: SleepFormSheetProps) {
  const createMutation = sleepLogsResource.useCreate();
  const updateMutation = sleepLogsResource.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaultValues(editing) });

  useEffect(() => {
    if (open) reset(toDefaultValues(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const [watchDate, watchSleep, watchWake] = watch(["date", "sleepTime", "wakeTime"]);

  const preview = useMemo(() => {
    if (!watchDate || !watchSleep || !watchWake) return undefined;
    const sleepAt = resolveNightTimestamp(watchDate, watchSleep);
    // 起床時間一律視為「起床日當天」，不套用前一晚判斷邏輯
    const wakeAt = new Date(`${watchDate}T${watchWake}:00`).toISOString();
    const hours = computeHours(sleepAt, wakeAt);
    return hours > 0 ? hours : undefined;
  }, [watchDate, watchSleep, watchWake]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const wakeAt = new Date(`${values.date}T${values.wakeTime || "00:00"}:00`).toISOString();
    const sleepAt = resolveNightTimestamp(values.date, values.sleepTime);
    const bedtime = resolveNightTimestamp(values.date, values.bedTime);
    const hours = computeHours(sleepAt, wakeAt);

    const payload: Partial<SleepLog> = {
      date: values.date,
      bedtime,
      sleepAt,
      wakeAt,
      hours,
      awakenings: Number(values.awakenings) || 0,
      quality: Number(values.quality),
      morningEnergy: Number(values.morningEnergy),
      preSleepActivity: values.preSleepActivity,
      notes: values.notes.trim() || undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新睡眠紀錄");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("已新增睡眠紀錄");
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) {
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          if (field in values) {
            setError(field as keyof FormValues, { type: "server", message: messages[0] ?? "格式不正確" });
          }
        }
      }
      // 失敗提示已由 resource.ts 的 mutation onError 顯示 toast，這裡僅避免未捕捉的 rejection。
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "編輯睡眠紀錄" : "新增睡眠紀錄"}
      description="填寫起床日與上床／入睡／起床時間，睡眠時數會自動計算。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="sleep-log-form" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增紀錄"}
          </Button>
        </>
      }
    >
      <form id="sleep-log-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input type="date" label="起床日" required {...register("date", { required: "請選擇日期" })} error={errors.date?.message} />

        <div className="grid grid-cols-3 gap-3">
          <Input type="time" label="上床時間" required {...register("bedTime", { required: "請填寫" })} error={errors.bedTime?.message} />
          <Input type="time" label="入睡時間" required {...register("sleepTime", { required: "請填寫" })} error={errors.sleepTime?.message} />
          <Input type="time" label="起床時間" required {...register("wakeTime", { required: "請填寫" })} error={errors.wakeTime?.message} />
        </div>

        <p className="rounded-md border border-line bg-paper-sunken px-3 py-2 text-caption text-ink-muted">
          推算睡眠時數：
          <span className="ml-1 tabular-nums text-ink">{preview ? `${formatNumber(preview, 1)} 小時` : "—"}</span>
        </p>

        <Input
          type="number"
          min={0}
          max={20}
          inputMode="numeric"
          label="夜間清醒次數"
          error={errors.awakenings?.message}
          {...register("awakenings", { valueAsNumber: true, min: 0, max: 20 })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="睡眠品質" options={QUALITY_OPTIONS} {...register("quality")} error={errors.quality?.message} />
          <Select label="晨間精神" options={ENERGY_OPTIONS} {...register("morningEnergy")} error={errors.morningEnergy?.message} />
        </div>

        <Select
          label="睡前主要活動"
          options={PRE_SLEEP_ACTIVITY_OPTIONS}
          {...register("preSleepActivity")}
          error={errors.preSleepActivity?.message}
        />

        <Textarea label="備註" placeholder="睡眠情境、狀態等補充說明（選填）" {...register("notes")} error={errors.notes?.message} />
      </form>
    </Sheet>
  );
}
