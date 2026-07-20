"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

import { mealLogsResource } from "./resource";
import { MEAL_TYPE_LABELS, MEAL_TYPES, type MealLog } from "./types";
import { mealTypeAtCurrentTime, todayDateStr } from "./utils";

const rowSchema = z.object({
  type: z.enum(MEAL_TYPES),
  text: z.string().min(1, "請輸入內容"),
  portion: z.string().optional().default(""),
  calories: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().nonnegative().optional()),
});

const batchSchema = z.object({
  date: z.string().min(1),
  rows: z.array(rowSchema).min(1, "至少需要一筆"),
});

type BatchFormValues = z.infer<typeof batchSchema>;

function emptyRow() {
  return { type: mealTypeAtCurrentTime(), text: "", portion: "", calories: undefined };
}

export interface BatchAddFormProps {
  onDone: () => void;
}

/** 批次新增：一次輸入多筆飲食紀錄，逐筆送出，降低重複開表單的操作成本。 */
export function BatchAddForm({ onDone }: BatchAddFormProps) {
  const createMutation = mealLogsResource.useCreate();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: { date: todayDateStr(), rows: [emptyRow(), emptyRow()] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "rows" });

  async function onSubmit(values: BatchFormValues) {
    const now = new Date();
    let successCount = 0;
    for (const row of values.rows) {
      const loggedAt = new Date(`${values.date}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`);
      const patch: Partial<MealLog> = {
        type: row.type,
        date: values.date,
        loggedAt: Number.isNaN(loggedAt.getTime()) ? now.toISOString() : loggedAt.toISOString(),
        text: row.text,
        portion: row.portion || undefined,
        foodTags: [],
        calories: row.calories,
      };
      try {
        // 逐筆送出以重用既有的 create mutation（含失敗 toast），避免重寫錯誤處理。
        // eslint-disable-next-line no-await-in-loop
        await createMutation.mutateAsync(patch);
        successCount += 1;
      } catch {
        // 單筆失敗已由 mutation 顯示 toast，其餘筆數繼續送出。
      }
    }
    if (successCount > 0) {
      toast.success(`已新增 ${successCount} 筆飲食紀錄。`);
    }
    if (successCount === values.rows.length) {
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input type="date" label="日期" {...register("date")} />

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-md border border-line p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-caption text-ink-muted">第 {index + 1} 筆</span>
              {fields.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                  移除
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[7rem_1fr_6rem_5rem]">
              <Select
                options={MEAL_TYPES.map((t) => ({ value: t, label: MEAL_TYPE_LABELS[t] }))}
                {...register(`rows.${index}.type` as const)}
              />
              <Input
                placeholder="這一餐吃了什麼"
                {...register(`rows.${index}.text` as const)}
                error={errors.rows?.[index]?.text?.message}
              />
              <Input placeholder="份量" {...register(`rows.${index}.portion` as const)} />
              <Input
                type="number"
                inputMode="decimal"
                placeholder="熱量"
                {...register(`rows.${index}.calories` as const)}
              />
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" size="sm" onClick={() => append(emptyRow())}>
        + 再加一筆
      </Button>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone}>
          取消
        </Button>
        <Button type="submit" loading={isSubmitting || createMutation.isPending}>
          全部新增
        </Button>
      </div>
    </form>
  );
}
