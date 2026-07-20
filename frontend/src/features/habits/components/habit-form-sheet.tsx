"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { habitsRepo } from "../repo";
import { useHabitsUiStore } from "../store";
import {
  HABIT_TYPE_LABEL,
  HABIT_TYPES,
  SCHEDULE_TYPE_LABEL,
  SCHEDULE_TYPES,
  WEEKDAY_LABEL,
  type Habit,
  type HabitSchedule,
} from "../types";

const formSchema = z
  .object({
    name: z.string().min(1, "請輸入習慣名稱").max(60),
    icon: z.string().min(1, "請輸入一個 emoji 圖示").max(4),
    type: z.enum(HABIT_TYPES),
    unit: z.string().max(12).optional(),
    targetValue: z.coerce.number().min(0),
    increment: z.coerce.number().min(0),
    scheduleType: z.enum(SCHEDULE_TYPES),
    scheduleDays: z.array(z.number()).optional(),
    scheduleDayOfMonth: z.coerce.number().min(1).max(31).optional(),
    scheduleN: z.coerce.number().min(2).max(90).optional(),
    reminderTime: z.string().optional(),
    notes: z.string().max(280).optional(),
  })
  .refine((data) => data.type === "boolean" || data.targetValue > 0, {
    message: "請輸入大於 0 的目標值",
    path: ["targetValue"],
  })
  .refine((data) => data.scheduleType !== "weekly-days" || (data.scheduleDays?.length ?? 0) > 0, {
    message: "請至少選擇一天",
    path: ["scheduleDays"],
  });

type FormValues = z.infer<typeof formSchema>;

const TYPE_OPTIONS = HABIT_TYPES.map((value) => ({ value, label: HABIT_TYPE_LABEL[value] }));
const SCHEDULE_OPTIONS = SCHEDULE_TYPES.map((value) => ({ value, label: SCHEDULE_TYPE_LABEL[value] }));

const DEFAULT_VALUES: FormValues = {
  name: "",
  icon: "🌱",
  type: "boolean",
  unit: "",
  targetValue: 1,
  increment: 1,
  scheduleType: "daily",
  scheduleDays: [1, 2, 3, 4, 5],
  scheduleDayOfMonth: 1,
  scheduleN: 2,
  reminderTime: "",
  notes: "",
};

function habitToFormValues(habit: Habit): FormValues {
  return {
    name: habit.name,
    icon: habit.icon,
    type: habit.type,
    unit: habit.unit ?? "",
    targetValue: habit.targetValue,
    increment: habit.increment,
    scheduleType: habit.schedule.type,
    scheduleDays: habit.schedule.days ?? [1, 2, 3, 4, 5],
    scheduleDayOfMonth: habit.schedule.dayOfMonth ?? 1,
    scheduleN: habit.schedule.n ?? 2,
    reminderTime: habit.reminderTime ?? "",
    notes: habit.notes ?? "",
  };
}

function buildSchedule(values: FormValues): HabitSchedule {
  switch (values.scheduleType) {
    case "weekly-days":
      return { type: "weekly-days", days: values.scheduleDays ?? [] };
    case "monthly":
      return { type: "monthly", dayOfMonth: values.scheduleDayOfMonth ?? 1 };
    case "every-n-days":
      return { type: "every-n-days", n: values.scheduleN ?? 2 };
    default:
      return { type: "daily" };
  }
}

export interface HabitFormSheetProps {
  habit?: Habit;
}

/** 新增／編輯習慣的 bottom sheet 表單。 */
export function HabitFormSheet({ habit }: HabitFormSheetProps) {
  const formOpen = useHabitsUiStore((s) => s.formOpen);
  const closeForm = useHabitsUiStore((s) => s.closeForm);
  const create = habitsRepo.useCreate();
  const update = habitsRepo.useUpdate();

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: habit ? habitToFormValues(habit) : DEFAULT_VALUES,
  });

  useEffect(() => {
    if (formOpen) {
      reset(habit ? habitToFormValues(habit) : DEFAULT_VALUES);
    }
  }, [formOpen, habit, reset]);

  const type = watch("type");
  const scheduleType = watch("scheduleType");
  const isBoolean = type === "boolean";

  const unitPlaceholder = useMemo(() => {
    if (type === "count") return "例如：下、次、杯";
    if (type === "duration") return "分鐘";
    if (type === "numeric") return "例如：毫升、公斤、小時";
    return "";
  }, [type]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<Habit> = {
      name: values.name.trim(),
      icon: values.icon.trim() || "🌱",
      type: values.type,
      unit: isBoolean ? undefined : values.unit?.trim() || undefined,
      targetValue: isBoolean ? 1 : values.targetValue,
      increment: isBoolean ? 1 : values.increment,
      schedule: buildSchedule(values),
      reminderTime: values.reminderTime?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    };

    if (habit) {
      update.mutate(
        { id: habit.id, patch: payload },
        {
          onSuccess: () => {
            toast.success(`已更新「${payload.name}」。`);
            closeForm();
          },
        },
      );
    } else {
      create.mutate(
        { ...payload, archived: false, sortOrder: Date.now() },
        {
          onSuccess: () => {
            toast.success(`已新增「${payload.name}」。`);
            closeForm();
          },
        },
      );
    }
  }

  const pending = isSubmitting || create.isPending || update.isPending;

  return (
    <Sheet
      open={formOpen}
      onClose={closeForm}
      title={habit ? "編輯習慣" : "新增習慣"}
      description="設定類型、目標與排程；之後仍可隨時調整。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={closeForm} disabled={pending}>
            取消
          </Button>
          <Button type="submit" form="habit-form" loading={pending}>
            {habit ? "儲存變更" : "新增習慣"}
          </Button>
        </>
      }
    >
      <form id="habit-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <Input label="圖示" placeholder="🌱" {...register("icon")} error={errors.icon?.message} />
          <Input label="習慣名稱" placeholder="例如：喝水、閱讀 30 分鐘" {...register("name")} error={errors.name?.message} />
        </div>

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select label="類型" options={TYPE_OPTIONS} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
          )}
        />

        {!isBoolean ? (
          <div className="grid grid-cols-3 gap-3">
            <Input label="單位" placeholder={unitPlaceholder} {...register("unit")} error={errors.unit?.message} />
            <Input
              label="目標值"
              type="number"
              min={0}
              step="any"
              {...register("targetValue")}
              error={errors.targetValue?.message}
            />
            <Input
              label="一鍵增量"
              type="number"
              min={0}
              step="any"
              hint="點擊 +1 時每次增加的量"
              {...register("increment")}
            />
          </div>
        ) : null}

        <Controller
          control={control}
          name="scheduleType"
          render={({ field }) => (
            <Select
              label="排程"
              options={SCHEDULE_OPTIONS}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
            />
          )}
        />

        {scheduleType === "weekly-days" ? (
          <Controller
            control={control}
            name="scheduleDays"
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
                          field.onChange(
                            selected ? current.filter((d) => d !== dayIndex) : [...current, dayIndex].sort(),
                          );
                        }}
                        className={`h-9 w-9 rounded-full border text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          selected
                            ? "border-ink bg-ink text-paper"
                            : "border-line-strong text-ink-soft hover:bg-paper-sunken"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {errors.scheduleDays ? (
                  <p role="alert" className="text-caption text-danger">
                    {errors.scheduleDays.message}
                  </p>
                ) : null}
              </div>
            )}
          />
        ) : null}

        {scheduleType === "monthly" ? (
          <Input
            label="每月第幾天"
            type="number"
            min={1}
            max={31}
            {...register("scheduleDayOfMonth")}
            hint="若當月天數不足會自動對齊該月最後一天"
          />
        ) : null}

        {scheduleType === "every-n-days" ? (
          <Input label="間隔天數" type="number" min={2} max={90} {...register("scheduleN")} />
        ) : null}

        <Input label="提醒時間（選填）" type="time" {...register("reminderTime")} />
        <Textarea label="備註（選填）" placeholder="想對自己說的話、進行方式…" {...register("notes")} />
      </form>
    </Sheet>
  );
}
