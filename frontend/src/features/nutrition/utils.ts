/**
 * features/nutrition/utils.ts — 日期/彙總輔助函式。
 */

import type { DateRangeFilter } from "./store";
import { NUTRIENT_FIELDS, type MealLog, type MealType } from "./types";

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function dateStrDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** 依篩選範圍過濾（date 為 YYYY-MM-DD 字串，可直接字典排序比較） */
export function withinRange(dateStr: string, range: DateRangeFilter): boolean {
  if (range === "all") return true;
  if (range === "today") return dateStr === todayDateStr();
  const threshold = range === "7d" ? dateStrDaysAgo(6) : dateStrDaysAgo(29);
  return dateStr >= threshold;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDateLabel(dateStr: string): string {
  const today = todayDateStr();
  const yesterday = yesterdayDateStr();
  if (dateStr === today) return "今天";
  if (dateStr === yesterday) return "昨天";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" });
}

export interface NutrientTotals {
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  calcium: number;
  fiber: number;
  water: number;
  /** 有輸入至少一項營養數值的記錄數，用於提示「部分未填寫」 */
  loggedCount: number;
  totalCount: number;
}

export function sumNutrients(logs: MealLog[]): NutrientTotals {
  const totals: NutrientTotals = {
    calories: 0,
    protein: 0,
    carb: 0,
    fat: 0,
    calcium: 0,
    fiber: 0,
    water: 0,
    loggedCount: 0,
    totalCount: logs.length,
  };
  for (const log of logs) {
    let hasAny = false;
    for (const field of NUTRIENT_FIELDS) {
      const value = log[field.key];
      if (typeof value === "number" && !Number.isNaN(value)) {
        totals[field.key] += value;
        hasAny = true;
      }
    }
    if (hasAny) totals.loggedCount += 1;
  }
  return totals;
}

export function groupByDate(logs: MealLog[]): Array<{ date: string; logs: MealLog[] }> {
  const map = new Map<string, MealLog[]>();
  for (const log of logs) {
    const bucket = map.get(log.date) ?? [];
    bucket.push(log);
    map.set(log.date, bucket);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, dateLogs]) => ({
      date,
      logs: dateLogs.sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1)),
    }));
}

export function mealTypeAtCurrentTime(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 20) return "dinner";
  return "snack";
}
