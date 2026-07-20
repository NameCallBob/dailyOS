/**
 * features/reminders/collect.ts — 純函式：把各模組的原始資料轉換成 ReminderItem[]。
 * 不含任何 I/O（不讀 Dexie、不呼叫瀏覽器 API），方便獨立測試。
 */

import type {
  ReadAppointment,
  ReadHabit,
  ReadHabitSchedule,
  ReadMedication,
  ReadMedicationSchedule,
  ReadTask,
  ReadUserProfile,
  ReadWaterLog,
} from "./schema";
import { addDaysLocal, combineDateAndTime, daysBetweenLocal, getDayOfMonthLocal, getWeekdayLocal, todayLocal } from "./date";
import type { ReminderItem } from "./types";

const TASK_INACTIVE_STATUSES = new Set(["completed", "cancelled", "archived"]);

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/** 該習慣在指定日期是否為排程日（需要執行的日子）；邏輯對齊 features/habits/stats.ts 的 isScheduledOn。 */
export function isHabitScheduledOn(schedule: ReadHabitSchedule, dateStr: string, createdAt: string): boolean {
  switch (schedule.type) {
    case "daily":
      return true;
    case "weekly-days":
      return (schedule.days ?? []).includes(getWeekdayLocal(dateStr));
    case "monthly": {
      const target = schedule.dayOfMonth ?? 1;
      const [y, m] = dateStr.split("-").map(Number);
      const clamped = Math.min(target, daysInMonth(y ?? 1970, m ?? 1));
      return getDayOfMonthLocal(dateStr) === clamped;
    }
    case "every-n-days": {
      const n = schedule.n ?? 2;
      const anchor = schedule.anchorDate ?? createdAt.slice(0, 10);
      const diff = daysBetweenLocal(dateStr, anchor);
      return diff >= 0 && diff % n === 0;
    }
    default:
      return true;
  }
}

export interface CollectWindow {
  /** 掃描起點（含）。 */
  from: Date;
  /** 掃描終點（含），用於背景預約與「即將到來」預覽清單。 */
  to: Date;
}

function withinWindow(dueAt: string, window: CollectWindow): boolean {
  const t = new Date(dueAt).getTime();
  return t >= window.from.getTime() && t <= window.to.getTime();
}

// ---------------------------------------------------------------------------
// 任務：tasks.remindAt（單次觸發）
// ---------------------------------------------------------------------------

export function collectTaskReminders(tasks: ReadTask[], window: CollectWindow): ReminderItem[] {
  const items: ReminderItem[] = [];
  for (const task of tasks) {
    if (task.deleted) continue;
    if (TASK_INACTIVE_STATUSES.has(task.status)) continue;
    if (!task.remindAt) continue;
    if (!withinWindow(task.remindAt, window)) continue;
    items.push({
      dedupeKey: `task:${task.id}:${task.remindAt}`,
      kind: "task",
      sourceId: task.id,
      title: "任務提醒",
      body: task.title,
      dueAt: task.remindAt,
      href: "/tasks",
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// 習慣：habits.reminderTime + schedule（每個排程日觸發一次）
// ---------------------------------------------------------------------------

export function collectHabitReminders(habits: ReadHabit[], window: CollectWindow): ReminderItem[] {
  const items: ReminderItem[] = [];
  const startDate = todayLocal();
  const dayCount = Math.max(1, Math.ceil((window.to.getTime() - window.from.getTime()) / 86_400_000) + 1);

  for (const habit of habits) {
    if (habit.deleted || habit.archived) continue;
    if (!habit.reminderTime) continue;

    let dateStr = startDate;
    for (let i = 0; i < dayCount; i += 1) {
      if (isHabitScheduledOn(habit.schedule, dateStr, habit.createdAt)) {
        const dueAt = combineDateAndTime(dateStr, habit.reminderTime);
        if (withinWindow(dueAt, window)) {
          items.push({
            dedupeKey: `habit:${habit.id}:${dateStr}`,
            kind: "habit",
            sourceId: habit.id,
            title: "習慣提醒",
            body: `該做「${habit.name}」了`,
            dueAt,
            href: "/habits",
          });
        }
      }
      dateStr = addDaysLocal(dateStr, 1);
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// 用藥：medication_schedules.timeOfDay（每天觸發一次，需搭配 medications 取名稱）
// ---------------------------------------------------------------------------

export function collectMedicationReminders(
  schedules: ReadMedicationSchedule[],
  medications: ReadMedication[],
  window: CollectWindow,
): ReminderItem[] {
  const nameById = new Map(medications.filter((m) => !m.deleted).map((m) => [m.id, m.name]));
  const items: ReminderItem[] = [];
  const startDate = todayLocal();
  const dayCount = Math.max(1, Math.ceil((window.to.getTime() - window.from.getTime()) / 86_400_000) + 1);

  for (const schedule of schedules) {
    if (schedule.deleted || !schedule.active) continue;
    const name = nameById.get(schedule.medicationId);
    if (!name) continue; // 對應藥物已刪除或尚未載入

    let dateStr = startDate;
    for (let i = 0; i < dayCount; i += 1) {
      const dueAt = combineDateAndTime(dateStr, schedule.timeOfDay);
      if (withinWindow(dueAt, window)) {
        items.push({
          dedupeKey: `medication:${schedule.id}:${dateStr}`,
          kind: "medication",
          sourceId: schedule.id,
          title: "用藥提醒",
          body: schedule.label ? `${name}（${schedule.label}）` : `該服用「${name}」了`,
          dueAt,
          href: "/meds",
        });
      }
      dateStr = addDaysLocal(dateStr, 1);
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// 回診 / 行程：appointments.startAt - reminderMinutesBefore（單次觸發）
// ---------------------------------------------------------------------------

const DEFAULT_APPOINTMENT_LEAD_MINUTES = 60;

export function collectAppointmentReminders(appointments: ReadAppointment[], window: CollectWindow): ReminderItem[] {
  const items: ReminderItem[] = [];
  for (const appt of appointments) {
    if (appt.deleted || appt.status !== "scheduled") continue;
    const leadMinutes = appt.reminderMinutesBefore ?? DEFAULT_APPOINTMENT_LEAD_MINUTES;
    const dueAt = new Date(new Date(appt.startAt).getTime() - leadMinutes * 60_000).toISOString();
    if (!withinWindow(dueAt, window)) continue;
    items.push({
      dedupeKey: `appointment:${appt.id}:${appt.startAt}`,
      kind: "appointment",
      sourceId: appt.id,
      title: "回診 / 行程提醒",
      body: `${appt.location} 即將開始`,
      dueAt,
      href: "/calendar",
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// 飲水：依 user_profile.waterGoalMl 與今日 water_logs 累積量，於固定檢查時段提醒。
// 注意：此項目僅在「今日」計算（需要即時累積量才能判斷是否已達標），關閉 App 後的
// 背景預約（見 notify.ts）因此無法即時檢查達標與否，只能是「定時提醒去喝水」而非
// 「還沒喝夠才提醒」——此為已知、誠實揭露的限制（見 capabilities.ts 與 UI 文案）。
// ---------------------------------------------------------------------------

const WATER_CHECK_TIMES = ["10:00", "13:00", "16:00", "19:00"] as const;

export function collectWaterReminders(
  waterLogs: ReadWaterLog[],
  profile: ReadUserProfile | undefined,
  window: CollectWindow,
): ReminderItem[] {
  const goal = profile?.waterGoalMl;
  if (!goal) return [];

  const date = todayLocal();
  const consumedToday = waterLogs
    .filter((log) => !log.deleted && log.date === date)
    .reduce((sum, log) => sum + log.amountMl, 0);
  if (consumedToday >= goal) return [];

  const items: ReminderItem[] = [];
  for (const time of WATER_CHECK_TIMES) {
    const dueAt = combineDateAndTime(date, time);
    if (!withinWindow(dueAt, window)) continue;
    items.push({
      dedupeKey: `water:${date}:${time}`,
      kind: "water",
      sourceId: `water:${date}`,
      title: "飲水提醒",
      body: `今日已飲水約 ${consumedToday}ml，目標 ${goal}ml，記得補充水分。`,
      dueAt,
      href: "/body",
    });
  }
  return items;
}
