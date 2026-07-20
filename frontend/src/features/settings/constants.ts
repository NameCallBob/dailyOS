/**
 * features/settings/constants.ts — 選項清單與顯示文字。
 * 供表單（設定頁 + Onboarding）共用，避免字串散落各元件。
 */

import { NAV_ITEMS, type NavItem } from "@/lib/nav";

// ---------------------------------------------------------------------------
// 個人資料
// ---------------------------------------------------------------------------

export const SEX_OPTIONS = [
  { value: "female", label: "女性" },
  { value: "male", label: "男性" },
  { value: "other", label: "其他" },
  { value: "unspecified", label: "不透露" },
] as const;

export const ACTIVITY_LEVEL_OPTIONS = [
  { value: "sedentary", label: "久坐少動（辦公室工作、幾乎不運動）" },
  { value: "light", label: "輕度活動（每週運動 1-2 次）" },
  { value: "moderate", label: "中度活動（每週運動 3-4 次）" },
  { value: "active", label: "高度活動（每週運動 5-6 次）" },
  { value: "very_active", label: "極高活動（勞力工作或每日高強度訓練）" },
] as const;

export const FITNESS_GOAL_OPTIONS = [
  { value: "lose_weight", label: "減重" },
  { value: "maintain", label: "維持現況" },
  { value: "build_muscle", label: "增肌" },
  { value: "improve_endurance", label: "提升心肺耐力" },
  { value: "general_health", label: "一般健康維護" },
] as const;

export const DATA_VISIBILITY_OPTIONS = [
  { value: "private", label: "僅自己可見（預設）" },
  { value: "shared", label: "可與已授權對象分享" },
] as const;

// ---------------------------------------------------------------------------
// Onboarding：使用目的
// ---------------------------------------------------------------------------

export const PURPOSE_OPTIONS = [
  { value: "work", label: "工作效率", description: "任務、專案、日曆、專注計時" },
  { value: "health", label: "健康管理", description: "身體數據、飲食、睡眠、用藥、症狀" },
  { value: "habit", label: "習慣養成", description: "每日習慣追蹤與提醒" },
  { value: "notes", label: "生活筆記", description: "隨手記錄與知識整理" },
] as const;

export type PurposeValue = (typeof PURPOSE_OPTIONS)[number]["value"];

/** 各使用目的預設建議啟用的模組（nav.ts 的 key），Onboarding 第二步用來預先勾選。 */
export const PURPOSE_MODULE_SUGGESTIONS: Record<PurposeValue, string[]> = {
  work: ["tasks", "calendar", "focus"],
  health: ["body", "nutrition", "sleep", "symptoms", "meds", "workouts"],
  habit: ["habits"],
  notes: ["notes"],
};

/** 一律強制啟用、不出現在勾選清單中的模組。 */
export const ALWAYS_ON_MODULE_KEYS = ["dashboard", "settings"];

/** 可於 Onboarding 選擇是否啟用的模組（排除一律啟用者）。 */
export const OPTIONAL_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter(
  (item) => !ALWAYS_ON_MODULE_KEYS.includes(item.key),
);

// ---------------------------------------------------------------------------
// 通知偏好
// ---------------------------------------------------------------------------

export const NOTIFICATION_CHANNEL_DEFS = [
  { key: "taskReminders", label: "任務到期提醒", description: "任務即將到期或逾期時通知" },
  { key: "habitReminders", label: "習慣提醒", description: "尚未完成當日習慣時提醒" },
  { key: "medicationReminders", label: "用藥提醒", description: "依服藥排程準時提醒" },
  { key: "waterReminders", label: "飲水提醒", description: "距上次飲水過久時提醒" },
  { key: "workoutReminders", label: "運動提醒", description: "排定的訓練或復健時段提醒" },
  { key: "appointmentReminders", label: "行程 / 回診提醒", description: "行事曆事件與回診前通知" },
  { key: "weeklySummary", label: "每週摘要", description: "每週一次整體進度總結" },
] as const;

export type NotificationChannelKey = (typeof NOTIFICATION_CHANNEL_DEFS)[number]["key"];

export const DEFAULT_NOTIFICATION_CHANNELS: Record<NotificationChannelKey, boolean> = {
  taskReminders: true,
  habitReminders: true,
  medicationReminders: true,
  waterReminders: false,
  workoutReminders: true,
  appointmentReminders: true,
  weeklySummary: true,
};

export const COMMON_TIMEZONES = [
  "Asia/Taipei",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
] as const;

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Taipei";
  } catch {
    return "Asia/Taipei";
  }
}

/** 時區下拉選單選項；若目前值不在常見清單中（例如裝置偵測到的時區），自動補上，避免選單顯示空白。 */
export function buildTimezoneOptions(currentValue?: string): { value: string; label: string }[] {
  const base = COMMON_TIMEZONES.map((tz) => ({ value: tz as string, label: tz as string }));
  if (currentValue && !COMMON_TIMEZONES.includes(currentValue as (typeof COMMON_TIMEZONES)[number])) {
    return [{ value: currentValue, label: currentValue }, ...base];
  }
  return base;
}
