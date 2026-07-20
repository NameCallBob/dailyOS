"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { repoFor, useSyncSchedules } from "../hooks";
import { useMedsUiStore } from "../store";
import {
  FREQUENCIES,
  FREQUENCY_LABEL,
  SOURCE_TYPE_LABEL,
  WEEKDAY_LABEL,
  WITH_FOOD_LABEL,
  WITH_FOOD_OPTIONS,
  type Medication,
  type SourceType,
} from "../types";

const formSchema = z
  .object({
    name: z.string().min(1, "請輸入名稱").max(80),
    dose: z.coerce.number().min(0, "劑量需為 0 以上"),
    unit: z.string().min(1, "請輸入單位").max(20),
    frequency: z.enum(FREQUENCIES),
    daysOfWeek: z.array(z.number()).optional(),
    intervalDays: z.coerce.number().min(2).max(90).optional(),
    times: z.array(z.string()).default([]),
    startDate: z.string().min(1, "請選擇開始日期"),
    endDate: z.string().optional(),
    withFood: z.enum(WITH_FOOD_OPTIONS),
    trackQty: z.boolean(),
    remainingQty: z.coerce.number().min(0).optional(),
    refillEnabled: z.boolean(),
    refillThreshold: z.coerce.number().min(0).optional(),
    active: z.boolean(),
    notes: z.string().max(280).optional(),
  })
  .refine((data) => data.frequency !== "specific-days" || (data.daysOfWeek?.length ?? 0) > 0, {
    message: "請至少選擇一天",
    path: ["daysOfWeek"],
  })
  .refine((data) => data.frequency === "as-needed" || data.times.length > 0, {
    message: "請至少新增一個服用時間",
    path: ["times"],
  });

type FormValues = z.infer<typeof formSchema>;

const FREQUENCY_OPTIONS = FREQUENCIES.map((value) => ({ value, label: FREQUENCY_LABEL[value] }));
const WITH_FOOD_SELECT_OPTIONS = WITH_FOOD_OPTIONS.map((value) => ({ value, label: WITH_FOOD_LABEL[value] }));

const DEFAULT_VALUES: FormValues = {
  name: "",
  dose: 1,
  unit: "顆",
  frequency: "daily",
  daysOfWeek: [1, 2, 3, 4, 5],
  intervalDays: 2,
  times: ["08:00"],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  withFood: "either",
  trackQty: false,
  remainingQty: undefined,
  refillEnabled: false,
  refillThreshold: 5,
  active: true,
  notes: "",
};

function itemToFormValues(item: Medication): FormValues {
  return {
    name: item.name,
    dose: item.dose,
    unit: item.unit,
    frequency: item.frequency,
    daysOfWeek: item.daysOfWeek ?? [1, 2, 3, 4, 5],
    intervalDays: item.intervalDays ?? 2,
    times: item.times,
    startDate: item.startDate,
    endDate: item.endDate ?? "",
    withFood: item.withFood,
    trackQty: item.remainingQty !== undefined,
    remainingQty: item.remainingQty,
    refillEnabled: item.refillReminder?.enabled ?? false,
    refillThreshold: item.refillReminder?.thresholdQty ?? 5,
    active: item.active,
    notes: item.notes ?? "",
  };
}

export interface MedFormSheetProps {
  sourceType: SourceType;
  item?: Medication;
}

/** 新增／編輯藥物或保健品的 bottom sheet 表單（兩種資源共用同一個表單元件）。 */
export function MedFormSheet({ sourceType, item }: MedFormSheetProps) {
  const formOpen = useMedsUiStore((s) => s.formOpen);
  const closeForm = useMedsUiStore((s) => s.closeForm);
  const repo = repoFor(sourceType);
  const create = repo.useCreate();
  const update = repo.useUpdate();
  const syncSchedules = useSyncSchedules();

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: item ? itemToFormValues(item) : DEFAULT_VALUES,
  });

  useEffect(() => {
    if (formOpen) {
      reset(item ? itemToFormValues(item) : DEFAULT_VALUES);
    }
  }, [formOpen, item, reset]);

  const frequency = watch("frequency");
  const trackQty = watch("trackQty");
  const refillEnabled = watch("refillEnabled");
  const times = watch("times");

  async function onSubmit(values: FormValues) {
    const payload: Partial<Medication> = {
      name: values.name.trim(),
      dose: values.dose,
      unit: values.unit.trim(),
      frequency: values.frequency,
      daysOfWeek: values.frequency === "specific-days" ? values.daysOfWeek : undefined,
      intervalDays: values.frequency === "every-n-days" ? values.intervalDays : undefined,
      times: values.frequency === "as-needed" ? [] : values.times,
      startDate: values.startDate,
      endDate: values.endDate?.trim() || undefined,
      withFood: values.withFood,
      remainingQty: values.trackQty ? values.remainingQty : undefined,
      refillReminder:
        values.trackQty && values.refillEnabled
          ? { enabled: true, thresholdQty: values.refillThreshold ?? 0 }
          : values.trackQty
            ? { enabled: false, thresholdQty: values.refillThreshold ?? 0 }
            : undefined,
      active: values.active,
      notes: values.notes?.trim() || undefined,
    };

    if (item) {
      update.mutate(
        { id: item.id, patch: payload },
        {
          onSuccess: async (saved) => {
            toast.success(`已更新「${payload.name}」。`);
            closeForm();
            await syncSchedules(sourceType, saved.id, saved.times, saved.active);
          },
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: async (saved) => {
          toast.success(`已新增「${payload.name}」。`);
          closeForm();
          await syncSchedules(sourceType, saved.id, saved.times, saved.active);
        },
      });
    }
  }

  const pending = isSubmitting || create.isPending || update.isPending;
  const typeLabel = SOURCE_TYPE_LABEL[sourceType];

  return (
    <Sheet
      open={formOpen}
      onClose={closeForm}
      title={item ? `編輯${typeLabel}` : `新增${typeLabel}`}
      description="僅供個人記錄與提醒使用，不構成用藥建議；劑量調整請諮詢醫師或藥師。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={closeForm} disabled={pending}>
            取消
          </Button>
          <Button type="submit" form="med-form" loading={pending}>
            {item ? "儲存變更" : `新增${typeLabel}`}
          </Button>
        </>
      }
    >
      <form id="med-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="名稱" placeholder={`例如：${sourceType === "medication" ? "脈優 5mg" : "維生素 D3"}`} {...register("name")} error={errors.name?.message} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="劑量" type="number" min={0} step="any" inputMode="decimal" {...register("dose")} error={errors.dose?.message} />
          <Input label="單位" placeholder="mg / 顆 / mL" {...register("unit")} error={errors.unit?.message} />
        </div>

        <Controller
          control={control}
          name="frequency"
          render={({ field }) => (
            <Select label="頻率" options={FREQUENCY_OPTIONS} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
          )}
        />

        {frequency === "specific-days" ? (
          <Controller
            control={control}
            name="daysOfWeek"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <span className="text-label uppercase text-ink-muted">選擇星期</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="選擇星期">
                  {WEEKDAY_LABEL.map((label, dayIndex) => {
                    const selected = (field.value ?? []).includes(dayIndex);
                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          const current = field.value ?? [];
                          field.onChange(selected ? current.filter((d) => d !== dayIndex) : [...current, dayIndex].sort());
                        }}
                        className={`h-9 w-9 rounded-full border text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          selected ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-soft hover:bg-paper-sunken"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {errors.daysOfWeek ? (
                  <p role="alert" className="text-caption text-danger">
                    {errors.daysOfWeek.message}
                  </p>
                ) : null}
              </div>
            )}
          />
        ) : null}

        {frequency === "every-n-days" ? (
          <Input label="間隔天數" type="number" min={2} max={90} {...register("intervalDays")} />
        ) : null}

        {frequency !== "as-needed" ? (
          <Controller
            control={control}
            name="times"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <span className="text-label uppercase text-ink-muted">服用時間</span>
                <div className="flex flex-col gap-2">
                  {(field.value ?? []).map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        aria-label={`服用時間 ${index + 1}`}
                        type="time"
                        value={time}
                        onChange={(e) => {
                          const next = [...(field.value ?? [])];
                          next[index] = e.target.value;
                          field.onChange(next);
                        }}
                        className="w-36"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="移除此時間"
                        onClick={() => field.onChange((field.value ?? []).filter((_, i) => i !== index))}
                      >
                        移除
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                  onClick={() => field.onChange([...(field.value ?? []), "08:00"])}
                >
                  + 新增時間
                </Button>
                {errors.times ? (
                  <p role="alert" className="text-caption text-danger">
                    {errors.times.message as string}
                  </p>
                ) : null}
              </div>
            )}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Input label="開始日期" type="date" {...register("startDate")} error={errors.startDate?.message} />
          <Input label="結束日期（選填）" type="date" {...register("endDate")} hint="留空代表持續使用" />
        </div>

        <Controller
          control={control}
          name="withFood"
          render={({ field }) => (
            <Select label="與飲食關係" options={WITH_FOOD_SELECT_OPTIONS} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
          )}
        />

        <label className="flex items-center gap-2 text-body text-ink">
          <input type="checkbox" className="h-4 w-4 rounded border-line-strong" {...register("trackQty")} />
          追蹤剩餘庫存
        </label>

        {trackQty ? (
          <div className="flex flex-col gap-3 rounded-md border border-line bg-paper-sunken p-3">
            <Input
              label="目前剩餘量"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              {...register("remainingQty")}
              error={errors.remainingQty?.message}
            />
            <label className="flex items-center gap-2 text-body text-ink">
              <input type="checkbox" className="h-4 w-4 rounded border-line-strong" {...register("refillEnabled")} />
              低於門檻時提醒補貨
            </label>
            {refillEnabled ? (
              <Input
                label="補貨提醒門檻"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                hint="剩餘量低於或等於此值時，清單會標示需要補貨"
                {...register("refillThreshold")}
              />
            ) : null}
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-body text-ink">
          <input type="checkbox" className="h-4 w-4 rounded border-line-strong" {...register("active")} />
          使用中（停用後不會出現提醒，但保留歷史紀錄）
        </label>

        <Textarea label="備註（選填）" placeholder="處方來源、保存方式等個人筆記" {...register("notes")} />

        <p className="text-caption text-ink-faint">
          {times.length > 0 && frequency !== "as-needed" ? `目前設定 ${times.length} 個服用時段，` : ""}
          本表單僅記錄你自行輸入的資訊，系統不會判斷用藥安全性或調整劑量。
        </p>
      </form>
    </Sheet>
  );
}
