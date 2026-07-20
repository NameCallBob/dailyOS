/**
 * features/habits/date.ts — 純日期工具（本地時區，YYYY-MM-DD 字串）。
 * 不引入額外套件，避免與 Foundation 相依版本衝突。
 */

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 將 Date 轉為本地 YYYY-MM-DD（非 UTC，避免跨時區日期偏移）。 */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 解析 YYYY-MM-DD 為本地日期（時間固定 00:00）。 */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function today(): string {
  return formatDate(new Date());
}

export function addDays(dateStr: string, delta: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

export function getWeekday(dateStr: string): number {
  return parseDate(dateStr).getDay();
}

export function getDayOfMonth(dateStr: string): number {
  return parseDate(dateStr).getDate();
}

/** a - b，以天為單位（正值代表 a 晚於 b）。 */
export function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / msPerDay);
}

/** 由今天往回推 n 天（含今天）產生日期字串陣列，由舊到新排序。 */
export function lastNDays(n: number, from: string = today()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(addDays(from, -i));
  }
  return out;
}

export function formatDisplayDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const WEEKDAY_FULL = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"] as const;

export function formatWeekday(dateStr: string): string {
  return WEEKDAY_FULL[getWeekday(dateStr)] ?? "";
}
