/**
 * features/habits/stats.ts — 排程判斷、今日進度、連續完成(streak)、完成率、趨勢等純函式。
 * 全部無副作用，方便單元測試與在元件間重複使用。
 */

import { addDays, daysBetween, getDayOfMonth, getWeekday, lastNDays, today } from "./date";
import type { Habit, HabitLog } from "./types";

const MAX_LOOKBACK_DAYS = 365;

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/** 該習慣在指定日期是否為排程日（需要執行的日子）。 */
export function isScheduledOn(habit: Habit, dateStr: string): boolean {
  const { schedule } = habit;
  switch (schedule.type) {
    case "daily":
      return true;
    case "weekly-days":
      return (schedule.days ?? []).includes(getWeekday(dateStr));
    case "monthly": {
      const target = schedule.dayOfMonth ?? 1;
      const [y, m] = dateStr.split("-").map(Number);
      const clamped = Math.min(target, daysInMonth(y ?? 1970, m ?? 1));
      return getDayOfMonth(dateStr) === clamped;
    }
    case "every-n-days": {
      const n = schedule.n ?? 2;
      const anchor = schedule.anchorDate ?? habit.createdAt.slice(0, 10);
      const diff = daysBetween(dateStr, anchor);
      return diff >= 0 && diff % n === 0;
    }
    default:
      return true;
  }
}

/** 依習慣類型判斷當日數值是否達標。 */
export function isValueDone(habit: Habit, value: number): boolean {
  if (habit.type === "boolean") return value >= 1;
  if (habit.targetValue <= 0) return value > 0;
  return value >= habit.targetValue;
}

export function findLog(logs: HabitLog[], habitId: string, date: string): HabitLog | undefined {
  return logs.find((log) => log.habitId === habitId && log.date === date && !log.deleted);
}

export interface TrendPoint {
  date: string;
  scheduled: boolean;
  value: number;
  done: boolean;
}

export interface HabitStats {
  todayScheduled: boolean;
  todayLog?: HabitLog;
  todayValue: number;
  todayDone: boolean;
  progressRatio: number;
  streak: number;
  completionRate30: number;
  scheduledCount30: number;
  doneCount30: number;
  trend: TrendPoint[];
}

/** 計算單一習慣的今日進度、連續天數、近 30 天完成率、近 7 天趨勢。 */
export function computeHabitStats(habit: Habit, logs: HabitLog[], asOf: string = today()): HabitStats {
  const habitLogs = logs.filter((log) => log.habitId === habit.id && !log.deleted);

  const todayScheduled = isScheduledOn(habit, asOf);
  const todayLog = findLog(habitLogs, habit.id, asOf);
  const todayValue = todayLog?.value ?? 0;
  const todayDone = isValueDone(habit, todayValue);
  const progressRatio =
    habit.type === "boolean" ? (todayDone ? 1 : 0) : Math.max(0, Math.min(1, todayValue / (habit.targetValue || 1)));

  // Streak：由 asOf 往回逐日檢查排程日是否達標，遇到未達標的排程日即中止。
  let streak = 0;
  let cursor = asOf;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i += 1) {
    if (isScheduledOn(habit, cursor)) {
      const log = findLog(habitLogs, habit.id, cursor);
      const done = isValueDone(habit, log?.value ?? 0);
      if (!done) {
        // 今天尚未打卡但今天還沒結束，不應打斷連續紀錄——允許今天例外一次。
        if (cursor === asOf) {
          cursor = addDays(cursor, -1);
          continue;
        }
        break;
      }
      streak += 1;
    }
    cursor = addDays(cursor, -1);
  }

  // 近 30 天完成率（僅計算排程日）。
  const window30 = lastNDays(30, asOf);
  let scheduledCount30 = 0;
  let doneCount30 = 0;
  for (const date of window30) {
    if (!isScheduledOn(habit, date)) continue;
    scheduledCount30 += 1;
    const log = findLog(habitLogs, habit.id, date);
    if (isValueDone(habit, log?.value ?? 0)) doneCount30 += 1;
  }
  const completionRate30 = scheduledCount30 > 0 ? Math.round((doneCount30 / scheduledCount30) * 100) : 0;

  // 近 7 天趨勢（供小型長條圖使用）。
  const trend: TrendPoint[] = lastNDays(7, asOf).map((date) => {
    const scheduled = isScheduledOn(habit, date);
    const log = findLog(habitLogs, habit.id, date);
    const value = log?.value ?? 0;
    return { date, scheduled, value, done: isValueDone(habit, value) };
  });

  return {
    todayScheduled,
    todayLog,
    todayValue,
    todayDone,
    progressRatio,
    streak,
    completionRate30,
    scheduledCount30,
    doneCount30,
    trend,
  };
}
