/**
 * features/nutrition/types.ts — 飲食模組共用型別與 zod schema。
 *
 * 資源：meal_logs（對應 Dexie 表 / REST `/api/v1/meal_logs/`，已在 lib/db.ts 預先宣告）。
 */

import { z } from "zod";

import type { BaseRecord } from "@/lib/types";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "supplement"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
  supplement: "保健品",
};

/** 使用者自訂營養項目（例如：鈉、維生素C…），不在標準欄位中的額外數值。 */
export interface CustomNutrient {
  id: string;
  label: string;
  value: number;
  unit?: string;
}

export const customNutrientSchema: z.ZodType<CustomNutrient> = z.object({
  id: z.string(),
  label: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
});

export interface MealLog extends BaseRecord {
  /** 記錄所屬日期 YYYY-MM-DD，供依日彙總與「複製昨日」使用。 */
  date: string;
  /** 實際紀錄時間 ISO timestamp */
  loggedAt: string;
  type: MealType;
  /** 相片（dataURL），選填 */
  photo?: string;
  /** 自由文字描述，例如「雞胸肉沙拉 + 溫泉蛋」 */
  text: string;
  foodTags: string[];
  /** 份量以自由文字描述（例如「一碗」「約150g」），不強迫精確數字 */
  portion?: string;
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

const optionalNonNegNumber = z
  .number()
  .nonnegative("數值不可為負數")
  .max(100000, "數值過大，請確認單位")
  .optional();

export const mealLogSchema: z.ZodType<MealLog> = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),

  date: z.string().min(1, "請選擇日期"),
  loggedAt: z.string().min(1),
  type: z.enum(MEAL_TYPES),
  photo: z.string().optional(),
  text: z.string().min(1, "請輸入這一餐的內容"),
  foodTags: z.array(z.string()),
  portion: z.string().optional(),
  calories: optionalNonNegNumber,
  protein: optionalNonNegNumber,
  carb: optionalNonNegNumber,
  fat: optionalNonNegNumber,
  calcium: optionalNonNegNumber,
  fiber: optionalNonNegNumber,
  water: optionalNonNegNumber,
  customNutrients: z.array(customNutrientSchema).optional(),
  notes: z.string().optional(),
});

/** 標準數值型營養欄位鍵，供表單與彙總共用 */
export const NUTRIENT_FIELDS = [
  { key: "calories", label: "熱量", unit: "kcal" },
  { key: "protein", label: "蛋白質", unit: "g" },
  { key: "carb", label: "碳水化合物", unit: "g" },
  { key: "fat", label: "脂肪", unit: "g" },
  { key: "calcium", label: "鈣", unit: "mg" },
  { key: "fiber", label: "膳食纖維", unit: "g" },
  { key: "water", label: "水分", unit: "ml" },
] as const;

export type NutrientKey = (typeof NUTRIENT_FIELDS)[number]["key"];
