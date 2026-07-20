"use client";

/**
 * metric-form-sheet.tsx — 新增／編輯身形量測（底部抽屜表單）。
 *
 * 驗證策略：必填（日期、時間、體重）由 react-hook-form 把關；完整數值範圍驗證交給
 * lib/resource.ts 內以 zod（bodyMetricSchema）為準的單一事實來源，錯誤時把
 * fieldErrors 映射回表單欄位，避免規則重複維護、產生落差。
 */

import { useEffect } from "react";
import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { newId } from "@/lib/resource";
import { ApiRequestError } from "@/lib/types";

import { BODY_METRIC_FIELDS, type MetricFieldDef } from "../constants";
import { bodyMetricsResource } from "../resources";
import type { BodyMetric } from "../schema";
import { formatTime, todayIsoDate } from "../utils";

export interface MetricFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: BodyMetric | null;
}

interface CustomRow {
  id: string;
  label: string;
  value: number | string;
  unit: string;
}

interface FormValues {
  date: string;
  time: string;
  weightKg: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  skeletalMuscleKg?: number;
  visceralFatLevel?: number;
  waistCm?: number;
  chestCm?: number;
  hipCm?: number;
  armCm?: number;
  thighCm?: number;
  calfCm?: number;
  restingHeartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  spo2Percent?: number;
  bodyTempCelsius?: number;
  note: string;
  customMetrics: CustomRow[];
}

function numOrUndef(n: number | undefined): number | undefined {
  return n === undefined || Number.isNaN(n) ? undefined : n;
}

function toDefaultValues(editing?: BodyMetric | null): FormValues {
  if (!editing) {
    return {
      date: todayIsoDate(),
      time: formatTime(new Date().toISOString()) || "08:00",
      weightKg: undefined as unknown as number,
      note: "",
      customMetrics: [],
    };
  }
  return {
    date: editing.date,
    time: formatTime(editing.loggedAt) || "08:00",
    weightKg: editing.weightKg,
    bodyFatPercent: editing.bodyFatPercent,
    muscleMassKg: editing.muscleMassKg,
    skeletalMuscleKg: editing.skeletalMuscleKg,
    visceralFatLevel: editing.visceralFatLevel,
    waistCm: editing.waistCm,
    chestCm: editing.chestCm,
    hipCm: editing.hipCm,
    armCm: editing.armCm,
    thighCm: editing.thighCm,
    calfCm: editing.calfCm,
    restingHeartRate: editing.restingHeartRate,
    bloodPressureSystolic: editing.bloodPressureSystolic,
    bloodPressureDiastolic: editing.bloodPressureDiastolic,
    spo2Percent: editing.spo2Percent,
    bodyTempCelsius: editing.bodyTempCelsius,
    note: editing.note ?? "",
    customMetrics: (editing.customMetrics ?? []).map((c) => ({ ...c })),
  };
}

const GROUPS: MetricFieldDef["group"][] = ["體組成", "圍度", "生理徵象"];

export function MetricFormSheet({ open, onClose, editing }: MetricFormSheetProps) {
  const createMutation = bodyMetricsResource.useCreate();
  const updateMutation = bodyMetricsResource.useUpdate();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaultValues(editing) });

  const { fields, append, remove } = useFieldArray({ control, name: "customMetrics" });

  useEffect(() => {
    if (open) reset(toDefaultValues(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const loggedAt = new Date(`${values.date}T${values.time || "00:00"}:00`).toISOString();
    const customMetrics = values.customMetrics
      .map((row) => ({
        id: row.id || newId(),
        label: row.label.trim(),
        value: typeof row.value === "number" ? row.value : Number(row.value),
        unit: row.unit.trim(),
      }))
      .filter((row) => row.label.length > 0 && row.unit.length > 0 && !Number.isNaN(row.value));

    const payload: Partial<BodyMetric> = {
      date: values.date,
      loggedAt,
      weightKg: values.weightKg,
      bodyFatPercent: numOrUndef(values.bodyFatPercent),
      muscleMassKg: numOrUndef(values.muscleMassKg),
      skeletalMuscleKg: numOrUndef(values.skeletalMuscleKg),
      visceralFatLevel: numOrUndef(values.visceralFatLevel),
      waistCm: numOrUndef(values.waistCm),
      chestCm: numOrUndef(values.chestCm),
      hipCm: numOrUndef(values.hipCm),
      armCm: numOrUndef(values.armCm),
      thighCm: numOrUndef(values.thighCm),
      calfCm: numOrUndef(values.calfCm),
      restingHeartRate: numOrUndef(values.restingHeartRate),
      bloodPressureSystolic: numOrUndef(values.bloodPressureSystolic),
      bloodPressureDiastolic: numOrUndef(values.bloodPressureDiastolic),
      spo2Percent: numOrUndef(values.spo2Percent),
      bodyTempCelsius: numOrUndef(values.bodyTempCelsius),
      note: values.note.trim() || undefined,
      customMetrics: customMetrics.length > 0 ? customMetrics : undefined,
      source: "manual",
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新量測紀錄");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("已新增量測紀錄");
      }
      onClose();
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
      title={editing ? "編輯量測紀錄" : "新增量測紀錄"}
      description="體重為必填，其餘欄位可留空；BMI 會依設定中的身高自動換算，不需重複輸入。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="body-metric-form" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增紀錄"}
          </Button>
        </>
      }
    >
      <form id="body-metric-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="日期" required {...register("date", { required: "請選擇日期" })} error={errors.date?.message} />
          <Input type="time" label="時間" required {...register("time", { required: "請選擇時間" })} error={errors.time?.message} />
        </div>

        <Input
          type="number"
          step={0.1}
          inputMode="decimal"
          label="體重（kg）"
          required
          error={errors.weightKg?.message}
          {...register("weightKg", { required: "請輸入體重", valueAsNumber: true })}
        />

        {GROUPS.map((group) => {
          const groupFields = BODY_METRIC_FIELDS.filter((f) => f.group === group && f.key !== "weightKg");
          if (groupFields.length === 0) return null;
          return (
            <fieldset key={group} className="flex flex-col gap-3">
              <legend className="mb-1 text-label uppercase text-ink-muted">{group}</legend>
              <div className="grid grid-cols-2 gap-3">
                {groupFields.map((field) => (
                  <Input
                    key={field.key}
                    type="number"
                    step={field.step}
                    inputMode="decimal"
                    label={`${field.label}（${field.unit}）`}
                    error={errors[field.key]?.message}
                    {...register(field.key, { valueAsNumber: true })}
                  />
                ))}
              </div>
            </fieldset>
          );
        })}

        <fieldset className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <legend className="text-label uppercase text-ink-muted">自訂指標</legend>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => append({ id: newId(), label: "", value: "", unit: "" })}
            >
              + 新增自訂指標
            </Button>
          </div>
          {fields.length === 0 ? (
            <p className="text-caption text-ink-muted">例如：空腹血糖、心率變異度等未內建的量測項目。</p>
          ) : null}
          {fields.map((row, index) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <Input label="名稱" placeholder="例如：血糖" {...register(`customMetrics.${index}.label` as const)} />
              <Input type="number" step="any" inputMode="decimal" label="數值" {...register(`customMetrics.${index}.value` as const)} />
              <Input label="單位" placeholder="mg/dL" {...register(`customMetrics.${index}.unit` as const)} />
              <Button type="button" variant="ghost" size="sm" aria-label="刪除此自訂指標" onClick={() => remove(index)}>
                刪除
              </Button>
            </div>
          ))}
        </fieldset>

        <Textarea label="備註" placeholder="量測情境、狀態等補充說明（選填）" {...register("note")} error={errors.note?.message} />
      </form>
    </Sheet>
  );
}
