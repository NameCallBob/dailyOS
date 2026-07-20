/**
 * features/body/schema.ts — 「身體數據」模組資料模型。
 *
 * 對應資源（見 lib/db.ts 已預先宣告的資料表）：
 * - body_metrics：單次身形量測（體重、體脂、圍度、生理徵象、自訂指標…）
 * - water_logs  ：單次飲水紀錄
 *
 * BMI 不落地儲存：由 weight + user_profile.heightCm 於畫面即時計算，避免重複輸入身高。
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// 共用 BaseRecord 欄位
// ---------------------------------------------------------------------------

const baseRecordShape = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
};

export const metricSourceSchema = z.enum(["manual", "device"]);
export type MetricSource = z.infer<typeof metricSourceSchema>;

// ---------------------------------------------------------------------------
// 自訂指標
// ---------------------------------------------------------------------------

export const customMetricEntrySchema = z.object({
  id: z.string(),
  label: z.string().min(1, "請輸入指標名稱").max(20, "名稱過長"),
  value: z.number({ invalid_type_error: "請輸入數值" }),
  unit: z.string().min(1, "請輸入單位").max(10, "單位過長"),
});
export type CustomMetricEntry = z.infer<typeof customMetricEntrySchema>;

// ---------------------------------------------------------------------------
// BodyMetric（身形量測）
// ---------------------------------------------------------------------------

export const bodyMetricSchema = z.object({
  ...baseRecordShape,
  /** 量測所屬日期 YYYY-MM-DD（用於分組／圖表） */
  date: z.string().min(1, "請選擇日期"),
  /** 實際記錄時間 ISO 字串 */
  loggedAt: z.string().min(1),
  weightKg: z
    .number({ invalid_type_error: "請輸入體重" })
    .positive("體重需大於 0")
    .max(400, "數值超出合理範圍"),
  bodyFatPercent: z.number().min(0).max(80).optional(),
  muscleMassKg: z.number().min(0).max(200).optional(),
  skeletalMuscleKg: z.number().min(0).max(150).optional(),
  visceralFatLevel: z.number().min(0).max(60).optional(),
  waistCm: z.number().min(0).max(300).optional(),
  chestCm: z.number().min(0).max(300).optional(),
  hipCm: z.number().min(0).max(300).optional(),
  armCm: z.number().min(0).max(120).optional(),
  thighCm: z.number().min(0).max(150).optional(),
  calfCm: z.number().min(0).max(120).optional(),
  restingHeartRate: z.number().min(0).max(300).optional(),
  bloodPressureSystolic: z.number().min(0).max(300).optional(),
  bloodPressureDiastolic: z.number().min(0).max(200).optional(),
  spo2Percent: z.number().min(0).max(100).optional(),
  bodyTempCelsius: z.number().min(25).max(45).optional(),
  customMetrics: z.array(customMetricEntrySchema).optional(),
  note: z.string().max(500).optional(),
  source: metricSourceSchema,
});

export type BodyMetric = z.infer<typeof bodyMetricSchema>;

/** 表單可編輯欄位（排除 BaseRecord 由 repo 自動管理的欄位） */
export type BodyMetricFormValues = Omit<BodyMetric, "id" | "createdAt" | "updatedAt" | "version" | "deleted">;

// ---------------------------------------------------------------------------
// WaterLog（飲水紀錄）
// ---------------------------------------------------------------------------

export const waterLogSchema = z.object({
  ...baseRecordShape,
  date: z.string().min(1, "請選擇日期"),
  loggedAt: z.string().min(1),
  amountMl: z
    .number({ invalid_type_error: "請輸入飲水量" })
    .positive("飲水量需大於 0")
    .max(5000, "單次紀錄超出合理範圍（上限 5000 毫升）"),
  containerLabel: z.string().max(40).optional(),
  note: z.string().max(300).optional(),
  source: metricSourceSchema,
});

export type WaterLog = z.infer<typeof waterLogSchema>;
export type WaterLogFormValues = Omit<WaterLog, "id" | "createdAt" | "updatedAt" | "version" | "deleted">;

// ---------------------------------------------------------------------------
// UserProfile（唯讀，僅取用身高供 BMI 計算；完整欄位由設定模組定義／維護）
// ---------------------------------------------------------------------------

export interface UserProfileLite {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  heightCm?: number;
  displayName?: string;
}

/** 寬鬆 schema：本模組僅讀取，不對 user_profile 執行 create/update，故不強制其餘欄位。 */
export const userProfileLiteSchema = z.object({
  ...baseRecordShape,
  heightCm: z.number().min(50).max(260).optional(),
  displayName: z.string().optional(),
}) satisfies z.ZodType<UserProfileLite>;
