/**
 * features/timeline/date-utils.ts — 本模組專用日期輔助函式。
 * 一律以「本地時區」的日期字串（YYYY-MM-DD）比較，避免時區造成的離線誤判。
 * （與其他模組各自持有一份同構工具，避免跨模組互相 import 造成耦合，符合 Agent 隔離規則。）
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

export function daysAgo(n: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function daysFromNow(n: number, hour = 9, minute = 0): Date {
  return daysAgo(-n, hour, minute);
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

/** "7/20（一）" 格式，日期分組標題用 */
export function formatDateHeading(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  const key = todayKey();
  const prefix = dateKey === key ? "今天　" : dateKey === toDateKey(daysAgo(-1)) ? "明天　" : dateKey === toDateKey(daysAgo(1)) ? "昨天　" : "";
  return `${prefix}${d.getMonth() + 1}/${d.getDate()}（${WEEKDAY_LABELS[d.getDay()]}）`;
}

export function formatDateShort(dateKey: string | undefined): string {
  if (!dateKey) return "—";
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateTimeLong(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${formatTime(iso)}`;
}

export function isoDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function withinRange(dateKey: string, start?: string, end?: string): boolean {
  if (start && dateKey < start) return false;
  if (end && dateKey > end) return false;
  return true;
}
