/**
 * features/dashboard/date-utils.ts — 總覽模組共用的日期輔助函式。
 * 一律以「本地時區」的日期字串（YYYY-MM-DD）比較「今天」，避免時區造成的離線誤判。
 */

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function isToday(iso: string | undefined): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) === todayKey();
}

export function isPastDate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) < todayKey();
}

export function daysAgo(n: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function daysFromNow(n: number, hour = 9, minute = 0): Date {
  return daysAgo(-n, hour, minute);
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return "夜深了，記得早點休息";
  if (hour < 12) return "早安";
  if (hour < 14) return "午安";
  if (hour < 18) return "下午好";
  if (hour < 22) return "晚安";
  return "夜深了，記得早點休息";
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateLabel(dateKey: string | null | undefined): string {
  if (!dateKey) return "未排定";
  const key = todayKey();
  if (dateKey === key) return "今天";
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatElapsed(startedAtIso: string, nowMs: number): string {
  const started = new Date(startedAtIso).getTime();
  const seconds = Math.max(0, Math.floor((nowMs - started) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function formatFullDate(date: Date): string {
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 星期${WEEKDAY_LABELS[date.getDay()]}`;
}
