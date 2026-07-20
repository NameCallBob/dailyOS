/**
 * features/reminders/date.ts — 本模組自有的最小日期／時間工具。
 * 刻意不依賴其他模組的 date.ts（例如 features/habits/date.ts），避免跨模組耦合；
 * 這裡只需要幾個純函式，重複幾行比新增跨模組依賴更單純。
 */

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 本機日期字串 YYYY-MM-DD（依瀏覽器所在時區，非 UTC）。 */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayLocal(): string {
  return formatLocalDate(new Date());
}

export function addDaysLocal(dateStr: string, delta: number): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(y ?? 1970, (m ?? 1) - 1, (day ?? 1) + delta);
  return formatLocalDate(d);
}

export function getWeekdayLocal(dateStr: string): number {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, day ?? 1).getDay();
}

export function getDayOfMonthLocal(dateStr: string): number {
  return Number(dateStr.split("-")[2] ?? 1);
}

export function daysBetweenLocal(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay ?? 1970, (am ?? 1) - 1, ad ?? 1);
  const db = Date.UTC(by ?? 1970, (bm ?? 1) - 1, bd ?? 1);
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

/** 將 YYYY-MM-DD + HH:mm 組成本機時區的 ISO 時間戳字串。 */
export function combineDateAndTime(dateStr: string, timeStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  const d = new Date(y ?? 1970, (m ?? 1) - 1, day ?? 1, h ?? 0, min ?? 0, 0, 0);
  return d.toISOString();
}

/** 取 ISO 時間戳的本機 HH:mm。 */
export function timeOfDayLocal(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
