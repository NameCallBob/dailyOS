/**
 * features/calendar/date-utils.ts — 純函式日期工具（無外部套件依賴）。
 * 所有時間一律以 ISO 8601 字串（UTC 或帶偏移量）儲存，顯示時依 `tz` 欄位換算。
 */

export const MINUTES_PER_DAY = 24 * 60;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** yyyy-mm-dd（本地時間） */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

export function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

/** 週一為一週起始 */
export function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  const dow = out.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(out, diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function diffMinutes(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}

export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function clampMinutes(minutes: number, snap = 15): number {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY - snap, minutes));
  return Math.round(clamped / snap) * snap;
}

// ---------------------------------------------------------------------------
// 格式化（zh-TW）
// ---------------------------------------------------------------------------

export function formatWeekdayShort(d: Date): string {
  return new Intl.DateTimeFormat("zh-TW", { weekday: "short" }).format(d);
}

export function formatMonthLabel(d: Date): string {
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long" }).format(d);
}

export function formatDateLabel(d: Date): string {
  return new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric", weekday: "short" }).format(d);
}

export function formatDateShort(d: Date): string {
  return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit" }).format(d);
}

export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

export function formatTimeRange(start: Date, end: Date, allDay: boolean): string {
  if (allDay) return "全天";
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const fmtFull = new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric" });
  const fmtDay = new Intl.DateTimeFormat("zh-TW", { day: "numeric" });
  return sameMonth
    ? `${fmtFull.format(weekStart)} – ${fmtDay.format(weekEnd)}`
    : `${fmtFull.format(weekStart)} – ${fmtFull.format(weekEnd)}`;
}

/** 組合 yyyy-mm-dd + HH:mm -> 本地時間的 Date */
export function combineDateTime(dateKey: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = parseDateKey(dateKey);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function toLocalInputDate(iso: string): string {
  return toDateKey(new Date(iso));
}

export function toLocalInputTime(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
