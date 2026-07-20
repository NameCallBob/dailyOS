"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { mealLogsResource } from "./resource";
import { TagInput } from "./tag-input";
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPES,
  NUTRIENT_FIELDS,
  customNutrientSchema,
  type CustomNutrient,
  type MealLog,
  type MealType,
} from "./types";
import { mealTypeAtCurrentTime, todayDateStr } from "./utils";

const numberField = z.preprocess((val) => {
  if (val === "" || val === undefined || val === null) return undefined;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isNaN(n) ? undefined : n;
}, z.number().nonnegative("不可為負數").max(100000, "數值過大，請確認單位").optional());

const mealFormSchema = z.object({
  type: z.enum(MEAL_TYPES),
  date: z.string().min(1, "請選擇日期"),
  time: z.string().min(1, "請選擇時間"),
  text: z.string().min(1, "請輸入這一餐的內容"),
  portion: z.string().optional().default(""),
  foodTags: z.array(z.string()).default([]),
  photo: z.string().optional().default(""),
  calories: numberField,
  protein: numberField,
  carb: numberField,
  fat: numberField,
  calcium: numberField,
  fiber: numberField,
  water: numberField,
  customNutrients: z.array(customNutrientSchema).default([]),
  notes: z.string().optional().default(""),
});

export type MealFormValues = z.infer<typeof mealFormSchema>;

export interface MealFormInitial {
  type?: MealType;
  date?: string;
  time?: string;
  text?: string;
  portion?: string;
  foodTags?: string[];
  photo?: string;
  calories?: number;
  protein?: number;
  carb?: number;
  fat?: number;
  calcium?: number;
  fiber?: number;
  water?: number;
  customNutrients?: CustomNutrient[];
  notes?: string;
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildDefaults(initial?: MealFormInitial): MealFormValues {
  return {
    type: initial?.type ?? mealTypeAtCurrentTime(),
    date: initial?.date ?? todayDateStr(),
    time: initial?.time ?? nowTimeStr(),
    text: initial?.text ?? "",
    portion: initial?.portion ?? "",
    foodTags: initial?.foodTags ?? [],
    photo: initial?.photo ?? "",
    calories: initial?.calories,
    protein: initial?.protein,
    carb: initial?.carb,
    fat: initial?.fat,
    calcium: initial?.calcium,
    fiber: initial?.fiber,
    water: initial?.water,
    customNutrients: initial?.customNutrients ?? [],
    notes: initial?.notes ?? "",
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface MealFormProps {
  mode: "create" | "edit";
  recordId?: string;
  initial?: MealFormInitial;
  onDone: () => void;
}

/** 新增／編輯單筆飲食紀錄的表單（於 Sheet 內使用）。所有營養欄位皆為選填。 */
export function MealForm({ mode, recordId, initial, onDone }: MealFormProps) {
  const createMutation = mealLogsResource.useCreate();
  const updateMutation = mealLogsResource.useUpdate();
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: buildDefaults(initial),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "customNutrients" });

  useEffect(() => {
    setValue("customNutrients", initial?.customNutrients ?? []);
    // 僅在切換編輯目標時重設，避免覆蓋使用者輸入中的自訂項目。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const foodTags = watch("foodTags");
  const photo = watch("photo");

  async function handlePhotoChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setValue("photo", dataUrl);
    } catch {
      toast.error("照片讀取失敗，請再試一次。");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function onSubmit(values: MealFormValues) {
    const loggedAt = new Date(`${values.date}T${values.time}:00`);
    const patch: Partial<MealLog> = {
      type: values.type,
      date: values.date,
      loggedAt: Number.isNaN(loggedAt.getTime()) ? new Date().toISOString() : loggedAt.toISOString(),
      text: values.text,
      foodTags: values.foodTags,
      portion: values.portion || undefined,
      photo: values.photo || undefined,
      calories: values.calories,
      protein: values.protein,
      carb: values.carb,
      fat: values.fat,
      calcium: values.calcium,
      fiber: values.fiber,
      water: values.water,
      customNutrients: values.customNutrients.length > 0 ? values.customNutrients : undefined,
      notes: values.notes || undefined,
    };

    try {
      if (mode === "edit" && recordId) {
        await updateMutation.mutateAsync({ id: recordId, patch });
        toast.success("已更新這筆飲食紀錄。");
      } else {
        await createMutation.mutateAsync(patch);
        toast.success("已新增飲食紀錄。");
      }
      onDone();
    } catch {
      // 失敗提示已由 resource.ts 的 mutation onError 觸發 toast，這裡不重複顯示。
    }
  }

  const busy = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="餐別"
          options={MEAL_TYPES.map((t) => ({ value: t, label: MEAL_TYPE_LABELS[t] }))}
          {...register("type")}
          error={errors.type?.message}
        />
        <Input label="份量（自由描述）" placeholder="例如：一碗、約150g" {...register("portion")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input type="date" label="日期" {...register("date")} error={errors.date?.message} />
        <Input type="time" label="時間" {...register("time")} error={errors.time?.message} />
      </div>

      <Textarea
        label="這一餐吃了什麼"
        placeholder="例如：雞胸肉沙拉佐橄欖油醋"
        {...register("text")}
        error={errors.text?.message}
      />

      <TagInput
        label="食物標籤"
        value={foodTags}
        onChange={(tags) => setValue("foodTags", tags)}
        placeholder="輸入食材後按 Enter，例如：雞胸肉"
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-label uppercase text-ink-muted">照片（選填）</span>
        <div className="flex items-center gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="這一餐的照片預覽" className="h-16 w-16 rounded-md border border-line object-cover" />
          ) : null}
          <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-line-strong px-3 text-caption text-ink-soft hover:bg-paper-sunken">
            {photoUploading ? "讀取中…" : photo ? "更換照片" : "上傳照片"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handlePhotoChange(e.target.files)}
            />
          </label>
          {photo ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setValue("photo", "")}>
              移除
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border border-line bg-paper-sunken p-3">
        <p className="mb-2 text-caption text-ink-muted">
          營養數值皆為選填，可略過不填，之後隨時可回來補上。
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NUTRIENT_FIELDS.slice(0, 4).map((field) => (
            <Input
              key={field.key}
              type="number"
              inputMode="decimal"
              step="any"
              label={`${field.label}（${field.unit}）`}
              {...register(field.key)}
              error={errors[field.key]?.message}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-3 text-caption text-accent underline-offset-2 hover:underline"
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? "收合進階營養與自訂項目" : "展開進階營養與自訂項目"}
        </button>

        {showAdvanced ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {NUTRIENT_FIELDS.slice(4).map((field) => (
                <Input
                  key={field.key}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  label={`${field.label}（${field.unit}）`}
                  {...register(field.key)}
                  error={errors[field.key]?.message}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-label uppercase text-ink-muted">自訂營養項目</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => append({ id: `custom-${Date.now()}-${fields.length}`, label: "", value: 0 })}
                >
                  + 新增項目
                </Button>
              </div>
              {fields.length === 0 ? (
                <p className="text-caption text-ink-muted">尚未新增自訂項目，例如：鈉、維生素C。</p>
              ) : (
                fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[1fr_5rem_4rem_2rem] items-end gap-2">
                    <Input label={index === 0 ? "名稱" : undefined} placeholder="例如：鈉" {...register(`customNutrients.${index}.label` as const)} />
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      label={index === 0 ? "數值" : undefined}
                      {...register(`customNutrients.${index}.value` as const, { valueAsNumber: true })}
                    />
                    <Input label={index === 0 ? "單位" : undefined} placeholder="mg" {...register(`customNutrients.${index}.unit` as const)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mb-0.5"
                      onClick={() => remove(index)}
                      aria-label="移除此自訂項目"
                    >
                      ×
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      <Textarea label="備註（選填）" {...register("notes")} />

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone}>
          取消
        </Button>
        <Button type="submit" loading={busy}>
          {mode === "edit" ? "儲存變更" : "新增紀錄"}
        </Button>
      </div>
    </form>
  );
}
