/**
 * features/settings/resources.ts — 本模組的 createResource 綁定。
 *
 * 三張表皆為 singleton（每位使用者僅一筆現行設定）：完整 CRUD 由 createResource 提供，
 * 但實際使用透過 hooks.ts 的 useSingleton() 包裝，確保「沒有資料時自動建立一筆預設值」
 * 而非讓畫面停留在空清單。
 */

import { createResource } from "@/lib/resource";

import {
  notificationPrefsSchema,
  userPreferencesSchema,
  userProfileSchema,
  type NotificationPrefs,
  type UserPreferences,
  type UserProfile,
} from "./schema";
import { seedNotificationPrefs, seedUserPreferences, seedUserProfile } from "./seed";

export const userProfileResource = createResource<UserProfile>({
  name: "user_profile",
  schema: userProfileSchema,
  seed: seedUserProfile,
});

export const userPreferencesResource = createResource<UserPreferences>({
  name: "user_preferences",
  schema: userPreferencesSchema,
  seed: seedUserPreferences,
});

export const notificationPrefsResource = createResource<NotificationPrefs>({
  name: "notification_prefs",
  schema: notificationPrefsSchema,
  seed: seedNotificationPrefs,
});
