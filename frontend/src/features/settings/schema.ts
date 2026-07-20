/**
 * features/settings/schema.ts — 「設定」模組資料模型。
 *
 * 對應資源（見 lib/db.ts 已預先宣告的資料表）：
 * - user_profile       ：個人基本資料 + 健康／健身目標（單筆，singleton）
 * - user_preferences   ：使用偏好、Onboarding 進度、啟用模組清單（單筆，singleton）
 * - notification_prefs ：通知偏好、安靜時段、時區（單筆，singleton）
 *
 * 注意：`user_profile.heightCm` / `displayName` 欄位命名需與 features/body 的
 * `userProfileLiteSchema` 保持一致（該模組僅唯讀取用，不在此重複宣告 seed）。
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

// ---------------------------------------------------------------------------
// UserProfile
// ---------------------------------------------------------------------------

export const sexSchema = z.enum(["female", "male", "other", "unspecified"]);
export type Sex = z.infer<typeof sexSchema>;

export const activityLevelSchema = z.enum(["sedentary", "light", "moderate", "active", "very_active"]);
export type ActivityLevel = z.infer<typeof activityLevelSchema>;

export const fitnessGoalSchema = z.enum([
  "lose_weight",
  "maintain",
  "build_muscle",
  "improve_endurance",
  "general_health",
]);
export type FitnessGoal = z.infer<typeof fitnessGoalSchema>;

export const dataVisibilitySchema = z.enum(["private", "shared"]);
export type DataVisibility = z.infer<typeof dataVisibilitySchema>;

export const userProfileSchema = z.object({
  ...baseRecordShape,
  displayName: z.string().max(40).optional(),
  heightCm: z.number().min(50, "身高需介於 50-260 公分").max(260, "身高需介於 50-260 公分").optional(),
  weightKg: z.number().min(20, "體重需介於 20-400 公斤").max(400, "體重需介於 20-400 公斤").optional(),
  birthYear: z
    .number()
    .int()
    .min(1900, "請輸入合理的出生年份")
    .max(new Date().getFullYear(), "出生年份不可晚於今年")
    .optional(),
  sex: sexSchema.optional(),
  activityLevel: activityLevelSchema.optional(),
  fitnessGoal: fitnessGoalSchema.optional(),
  waterGoalMl: z.number().int().min(500, "每日飲水目標至少 500 毫升").max(8000, "數值超出合理範圍").optional(),
  sleepGoalHours: z.number().min(3, "睡眠目標需介於 3-14 小時").max(14, "睡眠目標需介於 3-14 小時").optional(),
  stepGoalSteps: z.number().int().min(1000, "每日步數目標至少 1000 步").max(50000, "數值超出合理範圍").optional(),
  /** 健康資料預設僅本人可見；分享需使用者主動切換。 */
  healthDataVisibility: dataVisibilitySchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserProfileFormValues = Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "version" | "deleted">;

// ---------------------------------------------------------------------------
// UserPreferences
// ---------------------------------------------------------------------------

export const purposeSchema = z.enum(["work", "health", "habit", "notes"]);
export type Purpose = z.infer<typeof purposeSchema>;

export const userPreferencesSchema = z.object({
  ...baseRecordShape,
  purposes: z.array(purposeSchema),
  enabledModules: z.array(z.string()),
  onboardingCompleted: z.boolean(),
  onboardingStep: z.number().int().min(0).max(4),
  onboardingSkipped: z.boolean(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserPreferencesFormValues = Omit<
  UserPreferences,
  "id" | "createdAt" | "updatedAt" | "version" | "deleted"
>;

// ---------------------------------------------------------------------------
// NotificationPrefs
// ---------------------------------------------------------------------------

export const notificationChannelsSchema = z.object({
  taskReminders: z.boolean(),
  habitReminders: z.boolean(),
  medicationReminders: z.boolean(),
  waterReminders: z.boolean(),
  workoutReminders: z.boolean(),
  appointmentReminders: z.boolean(),
  weeklySummary: z.boolean(),
});
export type NotificationChannels = z.infer<typeof notificationChannelsSchema>;

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "請輸入 HH:mm 格式的時間");

export const notificationPrefsSchema = z.object({
  ...baseRecordShape,
  channels: notificationChannelsSchema,
  quietHoursEnabled: z.boolean(),
  quietHoursStart: timeOfDaySchema,
  quietHoursEnd: timeOfDaySchema,
  timezone: z.string().min(1, "請選擇時區"),
});

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;
export type NotificationPrefsFormValues = Omit<
  NotificationPrefs,
  "id" | "createdAt" | "updatedAt" | "version" | "deleted"
>;
