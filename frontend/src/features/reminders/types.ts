/**
 * features/reminders/types.ts — 本機提醒模組型別定義。
 *
 * 本模組不擁有任何 Dexie 資料表：channels / quietHours / timezone 沿用
 * features/settings 的 notification_prefs（見 resources.ts 說明）；
 * 提醒排程來源（tasks / habits / medication_schedules / appointments / water）
 * 皆為唯讀彙整，各自資料表由對應模組擁有與 seed。
 */

import type { NotificationChannelKey } from "@/features/settings/constants";

/** 提醒種類，對應 notification_prefs.channels 的鍵。 */
export type ReminderKind =
  | "task"
  | "habit"
  | "medication"
  | "water"
  | "appointment";

export const REMINDER_KIND_CHANNEL: Record<ReminderKind, NotificationChannelKey> = {
  task: "taskReminders",
  habit: "habitReminders",
  medication: "medicationReminders",
  water: "waterReminders",
  appointment: "appointmentReminders",
};

export const REMINDER_KIND_LABEL: Record<ReminderKind, string> = {
  task: "任務",
  habit: "習慣",
  medication: "用藥",
  water: "飲水",
  appointment: "回診 / 行程",
};

/** 排程器算出的一筆「待提醒」項目；`dedupeKey` 用於避免同一筆重複發送。 */
export interface ReminderItem {
  /** 去重鍵：`${kind}:${sourceId}:${dueAt 所屬時槽}`，同一時槽只會發送一次。 */
  dedupeKey: string;
  kind: ReminderKind;
  sourceId: string;
  title: string;
  body: string;
  /** ISO 時間戳，預計提醒時間。 */
  dueAt: string;
  /** 導覽用路徑（點擊通知後開啟的頁面），可省略。 */
  href?: string;
}

// ---------------------------------------------------------------------------
// 能力偵測
// ---------------------------------------------------------------------------

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export interface ReminderCapabilities {
  /** 瀏覽器是否支援 Notification API。 */
  notificationSupported: boolean;
  /** 目前的通知權限狀態。 */
  permission: NotificationPermissionState;
  /** 是否支援 Notification Triggers（'showTrigger' in Notification.prototype），
   *  僅 Chromium 系列（Chrome / Edge）目前有實作。 */
  supportsTriggers: boolean;
  /** 是否偵測為 Safari（含 iOS Safari）。 */
  isSafari: boolean;
  /** 是否已註冊 Service Worker（showNotification / showTrigger 皆需要）。 */
  serviceWorkerReady: boolean;
  /** 綜合結論：App 完全關閉時，此瀏覽器是否仍可靠地跳出提醒。 */
  canRemindWhenClosed: boolean;
}

export const DEFAULT_CAPABILITIES: ReminderCapabilities = {
  notificationSupported: false,
  permission: "unsupported",
  supportsTriggers: false,
  isSafari: false,
  serviceWorkerReady: false,
  canRemindWhenClosed: false,
};
