/**
 * features/habits/types.ts — 「習慣」模組型別與 zod schema。
 *
 * 資源：habits（習慣定義）、habit_logs（每日打卡記錄）。
 */

import { z } from "zod";

import type { BaseRecord } from "@/lib/types";

// ---------------------------------------------------------------------------
// Habit
// ---------------------------------------------------------------------------

export const HABIT_TYPES = ["boolean", "count", "numeric", "duration"] as const;
export type HabitType = (typeof HABIT_TYPES)[number];

export const SCHEDULE_TYPES = ["daily", "weekly-days", "monthly", "every-n-days"] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export const scheduleSchema = z.object({
  type: z.enum(SCHEDULE_TYPES),
  /** weekly-days：0=週日 ... 6=週六 */
  days: z.array(z.number().int().min(0).max(6)).optional(),
  /** monthly：每月第幾天（1-31） */
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  /** every-n-days：每 n 天一次 */
  n: z.number().int().min(2).max(90).optional(),
  /** every-n-days 的計算起點（YYYY-MM-DD），未提供時以 habit 建立日期為準 */
  anchorDate: z.string().optional(),
});

export type HabitSchedule = z.infer<typeof scheduleSchema>;

export const habitSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),

  name: z.string().min(1, "請輸入習慣名稱").max(60),
  icon: z.string().min(1).max(4),
  type: z.enum(HABIT_TYPES),
  /** count/numeric/duration 使用的單位，例如「毫升」「分鐘」「公斤」「小時」「杯」「次」 */
  unit: z.string().max(12).optional(),
  /** 每次達標的目標值；boolean 固定為 1 */
  targetValue: z.number().min(0),
  /** 一鍵記錄／+1 時的預設增量（count 類型用） */
  increment: z.number().min(0),
  schedule: scheduleSchema,
  reminderTime: z.string().optional(),
  archived: z.boolean(),
  notes: z.string().max(280).optional(),
  sortOrder: z.number(),
}) satisfies z.ZodType<Habit>;

export interface Habit extends BaseRecord {
  name: string;
  icon: string;
  type: HabitType;
  unit?: string;
  targetValue: number;
  increment: number;
  schedule: HabitSchedule;
  reminderTime?: string;
  archived: boolean;
  notes?: string;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// HabitLog
// ---------------------------------------------------------------------------

export const habitLogSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),

  habitId: z.string(),
  /** YYYY-MM-DD，本地日期（一天最多一筆彙總記錄） */
  date: z.string(),
  /** 當日累積值；boolean 類型 1=完成、0/不存在=未完成 */
  value: z.number().min(0),
  note: z.string().max(200).optional(),
  loggedAt: z.string(),
}) satisfies z.ZodType<HabitLog>;

export interface HabitLog extends BaseRecord {
  habitId: string;
  date: string;
  value: number;
  note?: string;
  loggedAt: string;
}

export const HABIT_TYPE_LABEL: Record<HabitType, string> = {
  boolean: "打勾型",
  count: "計數型",
  numeric: "數值型",
  duration: "時長型",
};

export const SCHEDULE_TYPE_LABEL: Record<ScheduleType, string> = {
  daily: "每天",
  "weekly-days": "每週指定日",
  monthly: "每月指定日",
  "every-n-days": "每隔 N 天",
};

export const WEEKDAY_LABEL = ["日", "一", "二", "三", "四", "五", "六"] as const;
