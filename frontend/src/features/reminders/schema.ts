/**
 * features/reminders/schema.ts — 排程來源資料的「唯讀子集」型別。
 *
 * 本模組不擁有 tasks / habits / habit_logs / medications / medication_schedules /
 * appointments / water_logs / user_profile 這些資料表 —— 它們分別由 tasks / habits /
 * meds / timeline / body / settings 模組擁有並負責 seed。此處僅宣告排程所需欄位的
 * 唯讀子集（對齊各自模組的 schema），供 resources.ts 建立「不提供 seed」的
 * createResource 綁定，讀取既有資料以計算下一次提醒時間。
 *
 * 規則同 features/timeline/schema.ts 的唯讀彙整區塊：一律不 seed，避免與擁有模組
 * 的 seed 形狀競爭；若在擁有模組尚未造訪前於此讀到空表，代表尚無資料可提醒，
 * 屬正常空狀態。
 */

import { z } from "zod";

const baseRecordShape = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
};

// ---------------------------------------------------------------------------
// tasks（對齊 features/tasks/types.ts）
// ---------------------------------------------------------------------------

export interface ReadTask {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  title: string;
  status: string;
  remindAt: string | null;
}

export const readTaskSchema: z.ZodType<ReadTask> = z.object({
  ...baseRecordShape,
  title: z.string(),
  status: z.string(),
  remindAt: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// habits（對齊 features/habits/types.ts）
// ---------------------------------------------------------------------------

export interface ReadHabitSchedule {
  type: string;
  days?: number[];
  dayOfMonth?: number;
  n?: number;
  anchorDate?: string;
}

export interface ReadHabit {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  name: string;
  schedule: ReadHabitSchedule;
  reminderTime?: string;
  archived: boolean;
}

const readHabitScheduleSchema: z.ZodType<ReadHabitSchedule> = z.object({
  type: z.string(),
  days: z.array(z.number()).optional(),
  dayOfMonth: z.number().optional(),
  n: z.number().optional(),
  anchorDate: z.string().optional(),
});

export const readHabitSchema: z.ZodType<ReadHabit> = z.object({
  ...baseRecordShape,
  name: z.string(),
  schedule: readHabitScheduleSchema,
  reminderTime: z.string().optional(),
  archived: z.boolean(),
});

// ---------------------------------------------------------------------------
// medications（對齊 features/meds/types.ts，僅取名稱供通知文案使用）
// ---------------------------------------------------------------------------

export interface ReadMedication {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  name: string;
  active: boolean;
}

export const readMedicationSchema: z.ZodType<ReadMedication> = z.object({
  ...baseRecordShape,
  name: z.string(),
  active: z.boolean(),
});

// ---------------------------------------------------------------------------
// medication_schedules（對齊 features/meds/types.ts）
// ---------------------------------------------------------------------------

export interface ReadMedicationSchedule {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  medicationId: string;
  timeOfDay: string;
  label?: string;
  active: boolean;
}

export const readMedicationScheduleSchema: z.ZodType<ReadMedicationSchedule> = z.object({
  ...baseRecordShape,
  medicationId: z.string(),
  timeOfDay: z.string(),
  label: z.string().optional(),
  active: z.boolean(),
});

// ---------------------------------------------------------------------------
// appointments（對齊 features/timeline/schema.ts）
// ---------------------------------------------------------------------------

export interface ReadAppointment {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  startAt: string;
  location: string;
  status: string;
  reminderMinutesBefore?: number;
}

export const readAppointmentSchema: z.ZodType<ReadAppointment> = z.object({
  ...baseRecordShape,
  startAt: z.string(),
  location: z.string(),
  status: z.string(),
  reminderMinutesBefore: z.number().optional(),
});

// ---------------------------------------------------------------------------
// water_logs（對齊 features/body/schema.ts，用於判斷今日是否已達飲水目標）
// ---------------------------------------------------------------------------

export interface ReadWaterLog {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  date: string;
  amountMl: number;
}

export const readWaterLogSchema: z.ZodType<ReadWaterLog> = z.object({
  ...baseRecordShape,
  date: z.string(),
  amountMl: z.number(),
});

// ---------------------------------------------------------------------------
// user_profile（對齊 features/settings/schema.ts，僅取飲水目標）
// ---------------------------------------------------------------------------

export interface ReadUserProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  waterGoalMl?: number;
}

export const readUserProfileSchema: z.ZodType<ReadUserProfile> = z.object({
  ...baseRecordShape,
  waterGoalMl: z.number().optional(),
});
