/**
 * features/reminders/index.ts — 模組對外介面。
 *
 * - initReminders()：供 App Shell 在掛載時呼叫一次，啟動 in-app 排程器（scheduler.ts）。
 * - <RemindersSection />：供設定頁（或其他頁面）嵌入的提醒設定區塊。
 */

export { initReminders, collectUpcomingReminders } from "./scheduler";
export { RemindersSection } from "./components/reminders-section";
export { detectReminderCapabilities } from "./capabilities";
export { useReminderCapabilities, useTestNotification, useUpcomingReminders } from "./hooks";
export type { ReminderCapabilities, ReminderItem, ReminderKind, NotificationPermissionState } from "./types";
