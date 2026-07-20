/**
 * features/reminders/quiet-hours.ts — 安靜時段純函式。
 * 支援跨午夜區間（例如 23:00 → 07:00）。
 */

import { addDaysLocal, combineDateAndTime, formatLocalDate, timeOfDayLocal } from "./date";

export interface QuietHoursPrefs {
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string; // HH:mm
}

/** 指定 ISO 時間戳的「時鐘時間」是否落在安靜時段內。 */
export function isWithinQuietHours(iso: string, prefs: QuietHoursPrefs): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const clock = timeOfDayLocal(iso);
  const { quietHoursStart: start, quietHoursEnd: end } = prefs;
  if (start === end) return false;
  if (start < end) {
    // 同日區間，例如 01:00 → 06:00
    return clock >= start && clock < end;
  }
  // 跨午夜區間，例如 23:00 → 07:00
  return clock >= start || clock < end;
}

/**
 * 若提醒時間落在安靜時段內，延後到當次安靜時段結束（quietHoursEnd 當天或隔天）；
 * 否則原樣回傳。用於「延後而非丟棄」——使用者仍會在安靜時段結束後收到通知。
 */
export function resolveQuietHours(iso: string, prefs: QuietHoursPrefs): string {
  if (!isWithinQuietHours(iso, prefs)) return iso;
  const d = new Date(iso);
  const dateStr = formatLocalDate(d);
  const clock = timeOfDayLocal(iso);
  const crossesMidnight = prefs.quietHoursStart > prefs.quietHoursEnd;
  // 同日區間：結束時間必在同一天。
  // 跨午夜區間：若目前時鐘已過午夜、落在「凌晨到 end」這段，結束時間在同一天；
  // 若目前仍在 start 到午夜這段（傍晚/深夜），結束時間在隔天。
  const endsToday = !crossesMidnight || clock < prefs.quietHoursEnd;
  const endDate = endsToday ? dateStr : addDaysLocal(dateStr, 1);
  return combineDateAndTime(endDate, prefs.quietHoursEnd);
}
