/**
 * features/settings/seed.ts — 試用模式種子資料。
 *
 * user_profile / user_preferences / notification_prefs 皆為「單筆設定」資料表
 * （每位使用者僅有一筆現行設定，非日誌型紀錄），因此種子資料刻意只提供 1 筆逼真的
 * 繁體中文預設值，而非一般模組常見的 6-15 筆歷史紀錄 — 此為此類 singleton 設定表
 * 的合理型態（歷史身形變化已由 features/body 的 body_metrics 記錄，非本模組職責）。
 */

import { newId, nowIso } from "@/lib/resource";
import { DEFAULT_NOTIFICATION_CHANNELS, detectTimezone } from "./constants";
import type { NotificationPrefs, UserPreferences, UserProfile } from "./schema";

export function seedUserProfile(): UserProfile[] {
  const now = nowIso();
  return [
    {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      displayName: "阿明",
      heightCm: 172,
      weightKg: 68.5,
      birthYear: 1992,
      sex: "male",
      activityLevel: "moderate",
      fitnessGoal: "general_health",
      waterGoalMl: 2000,
      sleepGoalHours: 7.5,
      stepGoalSteps: 8000,
      healthDataVisibility: "private",
    },
  ];
}

export function seedUserPreferences(): UserPreferences[] {
  const now = nowIso();
  return [
    {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      purposes: ["work", "health", "habit"],
      enabledModules: [
        "tasks",
        "calendar",
        "focus",
        "notes",
        "habits",
        "body",
        "nutrition",
        "sleep",
        "workouts",
      ],
      onboardingCompleted: true,
      onboardingStep: 4,
      onboardingSkipped: false,
    },
  ];
}

export function seedNotificationPrefs(): NotificationPrefs[] {
  const now = nowIso();
  return [
    {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      channels: { ...DEFAULT_NOTIFICATION_CHANNELS },
      quietHoursEnabled: true,
      quietHoursStart: "23:00",
      quietHoursEnd: "07:00",
      timezone: detectTimezone(),
    },
  ];
}
