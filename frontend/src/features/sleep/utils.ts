/**
 * features/sleep/utils.ts — 日期／時間格式化與基礎計算工具。
 *
 * 設計原則：任何「趨勢」或「規律度」文字僅在資料點足夠時才產生判讀，
 * 資料不足時一律回傳中性狀態，避免用單筆或極少樣本下結論。
 */

// ---------------------------------------------------------------------------
// 日期
// ---------------------------------------------------------------------------

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function formatDateShort(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateLong(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function combineDateTime(dateIso: string, timeHm: string): string {
  return new Date(`${dateIso}T${timeHm || "00:00"}:00`).toISOString();
}

/**
 * 表單只要求填寫「起床日」與三個時:分（上床／入睡／起床），
 * 但上床、入睡通常發生在前一晚。此函式依時鐘判斷該時間應歸屬起床日或前一天：
 * 24 小時制下午（>=12 點）視為「前一晚」，凌晨（<12 點）視為「與起床同一曆日」。
 */
export function resolveNightTimestamp(wakeDateIso: string, timeHm: string): string {
  if (!timeHm) return "";
  const hour = Number(timeHm.split(":")[0]);
  const wakeDate = new Date(`${wakeDateIso}T00:00:00`);
  if (!Number.isNaN(hour) && hour >= 12) {
    wakeDate.setDate(wakeDate.getDate() - 1);
  }
  const dateIso = wakeDate.toISOString().slice(0, 10);
  return combineDateTime(dateIso, timeHm);
}

function dayDiff(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / 86_400_000);
}

export function detectDateGaps(datesAsc: string[], thresholdDays = 3): Array<{ from: string; to: string; days: number }> {
  const gaps: Array<{ from: string; to: string; days: number }> = [];
  for (let i = 1; i < datesAsc.length; i += 1) {
    const prev = datesAsc[i - 1];
    const curr = datesAsc[i];
    if (prev === undefined || curr === undefined) continue;
    const diff = dayDiff(prev, curr);
    if (diff >= thresholdDays) {
      gaps.push({ from: prev, to: curr, days: diff });
    }
  }
  return gaps;
}

// ---------------------------------------------------------------------------
// 數值格式化
// ---------------------------------------------------------------------------

export function formatNumber(value: number | undefined, digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  if (digits === 0) return value.toFixed(0);
  const fixed = value.toFixed(digits);
  return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
}

export function sortByDateAsc<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function sortByDateDesc<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function withinLastDays<T extends { date: string }>(rows: T[], days: number): T[] {
  const cutoff = daysAgoIso(days - 1);
  return rows.filter((r) => r.date >= cutoff);
}

// ---------------------------------------------------------------------------
// 睡眠時數計算
// ---------------------------------------------------------------------------

/** 由入睡／起床時間計算時數（小時，保留 1 位小數）。 */
export function computeHours(sleepAtIso: string, wakeAtIso: string): number {
  const sleepAt = new Date(sleepAtIso).getTime();
  const wakeAt = new Date(wakeAtIso).getTime();
  if (Number.isNaN(sleepAt) || Number.isNaN(wakeAt) || wakeAt <= sleepAt) return 0;
  return Math.round(((wakeAt - sleepAt) / 3_600_000) * 10) / 10;
}

/** 上床到入睡的等待時間（分鐘）——即「睡眠潛伏期」，用於畫面補充資訊。 */
export function computeLatencyMinutes(bedtimeIso: string, sleepAtIso: string): number {
  const bedtime = new Date(bedtimeIso).getTime();
  const sleepAt = new Date(sleepAtIso).getTime();
  if (Number.isNaN(bedtime) || Number.isNaN(sleepAt) || sleepAt <= bedtime) return 0;
  return Math.round((sleepAt - bedtime) / 60_000);
}

/**
 * 將某個時間點換算為「以中午 12:00 為分界」的分鐘偏移量（0~1440），
 * 讓晚上 23:00 與凌晨 00:30 這類跨午夜的作息時間可以用同一數線比較，
 * 避免直接用時:分比較造成規律度誤判（23:00 與 00:30 其實只差 90 分鐘）。
 */
export function minutesSinceNoon(iso: string): number {
  const d = new Date(iso);
  const minutes = d.getHours() * 60 + d.getMinutes();
  // 正午之前視為「前一天深夜的延伸」，加上 1440 讓數線連續
  return minutes < 12 * 60 ? minutes + 24 * 60 : minutes;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = mean(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
}

export { mean, stddev };
