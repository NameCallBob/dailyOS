/**
 * features/reminders/scheduler.ts — in-app 排程器。
 *
 * App 開啟時：每次掃描都是可靠的（不依賴 Notification Triggers）——用 setInterval
 * 定期（預設 30 秒）重新計算「即將到期」與「已到期」的提醒，到期者直接發送通知。
 * 同時，對於「稍後才到期」的項目，若瀏覽器支援 Notification Triggers（見
 * capabilities.ts），會盡力預約背景通知，讓 App 關閉後仍有機會觸發；不支援的瀏覽器
 * （例如 Safari）就只能等使用者下次開啟 App 時，由這裡的掃描補上錯過的提醒。
 *
 * initReminders() 供 App Shell 掛載時呼叫一次（例如在根 layout 的 client 元件內
 * `useEffect(() => initReminders(), [])`）。重複呼叫是安全的（idempotent）。
 */

"use client";

import { isLocalData } from "@/lib/mode";
import { registerLocalWriteObserver } from "@/lib/resource";

import {
  collectAppointmentReminders,
  collectHabitReminders,
  collectMedicationReminders,
  collectTaskReminders,
  collectWaterReminders,
  type CollectWindow,
} from "./collect";
import { getSnoozeUntil, hasBeenSent, markSent, pruneSentLog } from "./dedupe";
import { cancelScheduledNotification, scheduleBackgroundTrigger, showReminderNotification } from "./notify";
import { isWithinQuietHours } from "./quiet-hours";
import {
  readAppointmentsResource,
  readHabitsResource,
  readMedicationSchedulesResource,
  readMedicationsResource,
  readTasksResource,
  readUserProfileResource,
  readWaterLogsResource,
  notificationPrefsResource,
  type NotificationPrefs,
} from "./resources";
import { REMINDER_KIND_CHANNEL, type ReminderItem } from "./types";

const SCAN_INTERVAL_MS = 30_000;
const IMMEDIATE_WINDOW_MS = 60_000 * 5; // 「已到期」認定為 [now-5min, now]
const BACKGROUND_WINDOW_MS = 60_000 * 60 * 48; // 為背景 Triggers / 預覽掃描未來 48 小時
const DEBOUNCE_MS = 1500;

let started = false;
let intervalHandle: ReturnType<typeof setInterval> | undefined;
let debounceHandle: ReturnType<typeof setTimeout> | undefined;
let unregisterWriteObserver: (() => void) | undefined;
const backgroundScheduled = new Set<string>();

const RELEVANT_TABLES = new Set<string>([
  "tasks",
  "habits",
  "medications",
  "medication_schedules",
  "appointments",
  "water_logs",
  "user_profile",
  "notification_prefs",
]);

async function fetchAll(): Promise<{
  tasks: Awaited<ReturnType<typeof readTasksResource.list>>["results"];
  habits: Awaited<ReturnType<typeof readHabitsResource.list>>["results"];
  medications: Awaited<ReturnType<typeof readMedicationsResource.list>>["results"];
  medicationSchedules: Awaited<ReturnType<typeof readMedicationSchedulesResource.list>>["results"];
  appointments: Awaited<ReturnType<typeof readAppointmentsResource.list>>["results"];
  waterLogs: Awaited<ReturnType<typeof readWaterLogsResource.list>>["results"];
  profile: Awaited<ReturnType<typeof readUserProfileResource.list>>["results"][number] | undefined;
  prefs: NotificationPrefs | undefined;
}> {
  const listAll = { pageSize: 1000 };
  const [tasks, habits, medications, medicationSchedules, appointments, waterLogs, profiles, prefsPage] =
    await Promise.all([
      readTasksResource.list(listAll),
      readHabitsResource.list(listAll),
      readMedicationsResource.list(listAll),
      readMedicationSchedulesResource.list(listAll),
      readAppointmentsResource.list(listAll),
      readWaterLogsResource.list(listAll),
      readUserProfileResource.list(listAll),
      notificationPrefsResource.list({ pageSize: 1 }),
    ]);

  return {
    tasks: tasks.results,
    habits: habits.results,
    medications: medications.results,
    medicationSchedules: medicationSchedules.results,
    appointments: appointments.results,
    waterLogs: waterLogs.results,
    profile: profiles.results[0],
    prefs: prefsPage.results[0],
  };
}

/** 計算目前所有應提醒的項目（給定時間窗），純粹供內部與預覽 UI 共用。 */
export async function collectUpcomingReminders(scanWindow: CollectWindow): Promise<ReminderItem[]> {
  const data = await fetchAll();
  return [
    ...collectTaskReminders(data.tasks, scanWindow),
    ...collectHabitReminders(data.habits, scanWindow),
    ...collectMedicationReminders(data.medicationSchedules, data.medications, scanWindow),
    ...collectAppointmentReminders(data.appointments, scanWindow),
    ...collectWaterReminders(data.waterLogs, data.profile, scanWindow),
  ].sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1));
}

function isChannelEnabled(item: ReminderItem, prefs: NotificationPrefs | undefined): boolean {
  if (!prefs) return true; // 尚未建立偏好紀錄前，預設不阻擋（避免新裝置永遠靜音）
  return prefs.channels[REMINDER_KIND_CHANNEL[item.kind]];
}

async function runScan(): Promise<void> {
  if (typeof window === "undefined" || !isLocalData()) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  pruneSentLog();

  const now = new Date();
  const scanWindow: CollectWindow = { from: new Date(now.getTime() - IMMEDIATE_WINDOW_MS), to: new Date(now.getTime() + BACKGROUND_WINDOW_MS) };
  const data = await fetchAll();
  const prefs = data.prefs;

  const items = [
    ...collectTaskReminders(data.tasks, scanWindow),
    ...collectHabitReminders(data.habits, scanWindow),
    ...collectMedicationReminders(data.medicationSchedules, data.medications, scanWindow),
    ...collectAppointmentReminders(data.appointments, scanWindow),
    ...collectWaterReminders(data.waterLogs, data.profile, scanWindow),
  ];

  for (const item of items) {
    if (!isChannelEnabled(item, prefs)) continue;

    const dueMs = new Date(item.dueAt).getTime();
    const isDueNow = dueMs <= now.getTime();

    if (isDueNow) {
      if (hasBeenSent(item.dedupeKey)) continue;
      const snoozeUntil = getSnoozeUntil(item.dedupeKey);
      if (snoozeUntil && new Date(snoozeUntil).getTime() > now.getTime()) continue;

      const inQuietHours = prefs ? isWithinQuietHours(item.dueAt, prefs) : false;
      if (inQuietHours) continue; // 安靜時段內：暫不發送，等下一輪掃描（此時已過安靜時段）再送

      const sent = await showReminderNotification(item);
      if (sent) markSent(item.dedupeKey, now);
      continue;
    }

    // 尚未到期：嘗試預約背景 Triggers（僅 Chromium 有效），供 App 關閉後使用。
    if (backgroundScheduled.has(item.dedupeKey) || hasBeenSent(item.dedupeKey)) continue;
    const scheduled = await scheduleBackgroundTrigger(item);
    if (scheduled) backgroundScheduled.add(item.dedupeKey);
  }

  // 清掉已消失來源（例如任務被刪除／改期）殘留的背景預約標記，避免記憶體無限增長。
  if (backgroundScheduled.size > 500) {
    const stillValid = new Set(items.map((i) => i.dedupeKey));
    for (const key of backgroundScheduled) {
      if (!stillValid.has(key)) {
        backgroundScheduled.delete(key);
        void cancelScheduledNotification(key);
      }
    }
  }
}

function scheduleDebouncedScan(): void {
  if (debounceHandle) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(() => {
    void runScan();
  }, DEBOUNCE_MS);
}

/**
 * 啟動本機提醒的 in-app 排程器。供 App Shell 於掛載時呼叫一次；重複呼叫安全（no-op）。
 * 僅於 trial / local（Dexie）模式運作；auth 模式的提醒由後端 Web Push 負責，不在此範圍。
 * 回傳 dispose 函式（測試或特殊情境可用來停止排程；App Shell 一般不需呼叫）。
 */
export function initReminders(): () => void {
  if (typeof window === "undefined") return () => {};
  if (started) {
    return () => {}; // 已啟動過；沿用既有排程，避免重複計時器。
  }
  started = true;

  void runScan();
  intervalHandle = setInterval(() => void runScan(), SCAN_INTERVAL_MS);
  unregisterWriteObserver = registerLocalWriteObserver((name) => {
    if (RELEVANT_TABLES.has(name)) scheduleDebouncedScan();
  });

  return () => {
    started = false;
    if (intervalHandle) clearInterval(intervalHandle);
    if (debounceHandle) clearTimeout(debounceHandle);
    unregisterWriteObserver?.();
  };
}
