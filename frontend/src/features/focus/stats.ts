/** features/focus/stats.ts — 每日/每週/月度統計聚合。 */

import { FOCUS_CATEGORY_LABELS, type FocusCategory, type TimeEntry } from "./types";
import type { StatsPeriod } from "./store";

export interface DateRange {
  start: Date;
  end: Date;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const day = c.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // 週一為起始
  c.setDate(c.getDate() - diff);
  return c;
}

function startOfMonth(d: Date): Date {
  const c = startOfDay(d);
  c.setDate(1);
  return c;
}

export function rangeForPeriod(period: StatsPeriod, now: Date = new Date()): DateRange {
  const end = new Date(now.getTime() + 1); // inclusive-ish
  if (period === "day") return { start: startOfDay(now), end };
  if (period === "week") return { start: startOfWeek(now), end };
  return { start: startOfMonth(now), end };
}

export function filterEntriesInRange(entries: TimeEntry[], range: DateRange): TimeEntry[] {
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();
  return entries.filter((e) => {
    if (e.deleted) return false;
    const startAt = new Date(e.startAt).getTime();
    return startAt >= startMs && startAt < endMs;
  });
}

export function sumDurationSeconds(entries: TimeEntry[]): number {
  return entries.reduce((total, e) => total + e.durationSeconds, 0);
}

export interface CategoryTotal {
  category: FocusCategory;
  label: string;
  totalSeconds: number;
  count: number;
}

export function aggregateByCategory(entries: TimeEntry[]): CategoryTotal[] {
  const map = new Map<FocusCategory, { totalSeconds: number; count: number }>();
  for (const e of entries) {
    const existing = map.get(e.category) ?? { totalSeconds: 0, count: 0 };
    existing.totalSeconds += e.durationSeconds;
    existing.count += 1;
    map.set(e.category, existing);
  }
  return [...map.entries()]
    .map(([category, agg]) => ({ category, label: FOCUS_CATEGORY_LABELS[category], ...agg }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

/** 依「日」分組加總，供簡易長條顯示（近 N 天，含 0 值日期補齊）。 */
export function dailyTotalsForRange(entries: TimeEntry[], days: number, now: Date = new Date()): Array<{ date: Date; totalSeconds: number }> {
  const buckets: Array<{ date: Date; totalSeconds: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = startOfDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    buckets.push({ date: d, totalSeconds: 0 });
  }
  for (const e of entries) {
    if (e.deleted) continue;
    const d = startOfDay(new Date(e.startAt));
    const bucket = buckets.find((b) => b.date.getTime() === d.getTime());
    if (bucket) bucket.totalSeconds += e.durationSeconds;
  }
  return buckets;
}
