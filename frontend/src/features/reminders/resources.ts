/**
 * features/reminders/resources.ts — 本模組的 createResource 綁定。
 *
 * 全部唯讀彙整（不提供 seed，也不呼叫 create/update/remove）：
 * tasks / habits / medications / medication_schedules / appointments / water_logs /
 * user_profile 分別由 tasks / habits / meds / timeline / body / settings 模組擁有。
 *
 * notification_prefs（提醒偏好：各類型開關、安靜時段、時區）直接沿用
 * features/settings 既有的 notificationPrefsResource / useSingletonResource，
 * 不在本模組重複宣告，避免 schema 與 seed 兩份定義互相漂移。
 */

import { createResource } from "@/lib/resource";

import {
  readAppointmentSchema,
  readHabitSchema,
  readMedicationScheduleSchema,
  readMedicationSchema,
  readTaskSchema,
  readUserProfileSchema,
  readWaterLogSchema,
  type ReadAppointment,
  type ReadHabit,
  type ReadMedication,
  type ReadMedicationSchedule,
  type ReadTask,
  type ReadUserProfile,
  type ReadWaterLog,
} from "./schema";

export const readTasksResource = createResource<ReadTask>({
  name: "tasks",
  schema: readTaskSchema,
});

export const readHabitsResource = createResource<ReadHabit>({
  name: "habits",
  schema: readHabitSchema,
});

export const readMedicationsResource = createResource<ReadMedication>({
  name: "medications",
  schema: readMedicationSchema,
});

export const readMedicationSchedulesResource = createResource<ReadMedicationSchedule>({
  name: "medication_schedules",
  schema: readMedicationScheduleSchema,
});

export const readAppointmentsResource = createResource<ReadAppointment>({
  name: "appointments",
  schema: readAppointmentSchema,
});

export const readWaterLogsResource = createResource<ReadWaterLog>({
  name: "water_logs",
  schema: readWaterLogSchema,
});

export const readUserProfileResource = createResource<ReadUserProfile>({
  name: "user_profile",
  schema: readUserProfileSchema,
});

// 提醒偏好（開關 / 安靜時段 / 時區）沿用設定模組既有資源。
export { notificationPrefsResource } from "@/features/settings/resources";
export { useSingletonResource } from "@/features/settings/hooks";
export { NOTIFICATION_CHANNEL_DEFS, DEFAULT_NOTIFICATION_CHANNELS, detectTimezone } from "@/features/settings/constants";
export { seedNotificationPrefs } from "@/features/settings/seed";
export type { NotificationChannels, NotificationPrefs } from "@/features/settings/schema";
