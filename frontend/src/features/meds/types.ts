/**
 * features/meds/types.ts — 「用藥」模組型別與 zod schema。
 *
 * 資源：medications（藥物）、supplements（保健品，同構）、
 *       medication_schedules（服用時段，供提醒/紀錄關聯）、
 *       medication_logs（服用／漏服紀錄，同時記錄兩種來源）。
 *
 * 重要限制（產品安全邊界，禁止違反）：
 * - 本模組僅提供「記錄、提醒、補貨追蹤」，不得判斷用藥安全性、
 *   不得自動調整劑量、無可靠來源不得提供交互作用結論。
 * - 因此型別中不存在「安全等級」「建議劑量」「交互作用」等欄位或衍生邏輯。
 */

import { z } from "zod";

import type { BaseRecord } from "@/lib/types";

// ---------------------------------------------------------------------------
// 共用列舉
// ---------------------------------------------------------------------------

export const FREQUENCIES = ["daily", "specific-days", "every-n-days", "as-needed"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: "每天",
  "specific-days": "每週指定日",
  "every-n-days": "每隔 N 天",
  "as-needed": "需要時服用（PRN）",
};

export const WITH_FOOD_OPTIONS = ["with_food", "empty_stomach", "either"] as const;
export type WithFoodOption = (typeof WITH_FOOD_OPTIONS)[number];

export const WITH_FOOD_LABEL: Record<WithFoodOption, string> = {
  with_food: "隨餐服用",
  empty_stomach: "空腹服用",
  either: "不限",
};

export const WEEKDAY_LABEL = ["日", "一", "二", "三", "四", "五", "六"] as const;

/** 用藥/保健品共用來源類型，medication_schedules 與 medication_logs 都需標示屬於哪一種資源。 */
export const SOURCE_TYPES = ["medication", "supplement"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  medication: "藥物",
  supplement: "保健品",
};

// ---------------------------------------------------------------------------
// Medication / Supplement（同構）
// ---------------------------------------------------------------------------

const refillReminderSchema = z.object({
  enabled: z.boolean(),
  /** 剩餘量低於或等於此值時提示補貨 */
  thresholdQty: z.number().min(0),
});

export type RefillReminder = z.infer<typeof refillReminderSchema>;

/** 藥物／保健品共用欄位（不含 BaseRecord），供兩份 schema 共用避免重複定義。 */
const medicationLikeFields = {
  name: z.string().min(1, "請輸入名稱").max(80),
  dose: z.number().min(0, "劑量需為 0 以上"),
  unit: z.string().min(1, "請輸入單位").max(20),
  frequency: z.enum(FREQUENCIES),
  /** specific-days：0=週日 ... 6=週六 */
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  /** every-n-days：每 n 天一次 */
  intervalDays: z.number().int().min(2).max(90).optional(),
  /** 每日服用時間點（HH:mm），as-needed 可為空陣列 */
  times: z.array(z.string()),
  /** YYYY-MM-DD */
  startDate: z.string().min(1, "請選擇開始日期"),
  endDate: z.string().optional(),
  withFood: z.enum(WITH_FOOD_OPTIONS),
  /** 目前剩餘量（顆/錠/mL…，依 unit），未填代表不追蹤庫存 */
  remainingQty: z.number().min(0).optional(),
  refillReminder: refillReminderSchema.optional(),
  active: z.boolean(),
  /** 使用者自行填寫的備註（例如處方來源、保存方式），非系統判斷 */
  notes: z.string().max(280).optional(),
};

export const medicationSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
  ...medicationLikeFields,
}) satisfies z.ZodType<Medication>;

export interface Medication extends BaseRecord {
  name: string;
  dose: number;
  unit: string;
  frequency: Frequency;
  daysOfWeek?: number[];
  intervalDays?: number;
  times: string[];
  startDate: string;
  endDate?: string;
  withFood: WithFoodOption;
  remainingQty?: number;
  refillReminder?: RefillReminder;
  active: boolean;
  notes?: string;
}

export const supplementSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
  ...medicationLikeFields,
}) satisfies z.ZodType<Supplement>;

/** 保健品目前欄位與 Medication 完全相同，以型別別名表示同構關係，供未來各自擴充。 */
export type Supplement = Medication;

// ---------------------------------------------------------------------------
// MedicationSchedule（服用時段）
// ---------------------------------------------------------------------------

export const medicationScheduleSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),

  medicationId: z.string(),
  sourceType: z.enum(SOURCE_TYPES),
  /** HH:mm */
  timeOfDay: z.string(),
  label: z.string().max(40).optional(),
  active: z.boolean(),
}) satisfies z.ZodType<MedicationSchedule>;

export interface MedicationSchedule extends BaseRecord {
  medicationId: string;
  sourceType: SourceType;
  timeOfDay: string;
  label?: string;
  active: boolean;
}

// ---------------------------------------------------------------------------
// MedicationLog（服用／漏服紀錄）
// ---------------------------------------------------------------------------

export const LOG_STATUSES = ["taken", "missed", "skipped"] as const;
export type LogStatus = (typeof LOG_STATUSES)[number];

export const LOG_STATUS_LABEL: Record<LogStatus, string> = {
  taken: "已服用",
  missed: "漏服",
  skipped: "主動略過",
};

export const medicationLogSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),

  medicationId: z.string(),
  sourceType: z.enum(SOURCE_TYPES),
  scheduleId: z.string().optional(),
  /** 這次服用「應該」發生的時間點（ISO），供對照排程與遲到記錄 */
  scheduledFor: z.string(),
  status: z.enum(LOG_STATUSES),
  /** 實際服用時間（ISO），僅 status=taken 時才有意義 */
  takenAt: z.string().optional(),
  /** 這次服用的數量，預設等於藥物的 dose */
  quantity: z.number().min(0).optional(),
  note: z.string().max(200).optional(),
}) satisfies z.ZodType<MedicationLog>;

export interface MedicationLog extends BaseRecord {
  medicationId: string;
  sourceType: SourceType;
  scheduleId?: string;
  scheduledFor: string;
  status: LogStatus;
  takenAt?: string;
  quantity?: number;
  note?: string;
}
