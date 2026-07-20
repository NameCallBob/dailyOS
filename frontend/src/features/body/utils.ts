/**
 * features/body/utils.ts — 計算與格式化工具（BMI、日期、缺口偵測、趨勢摘要）。
 *
 * 設計原則：不得以單次量測下結論——任何「趨勢」文字僅在資料點足夠（≥3 筆）時才產生，
 * 否則一律回傳中性提示，避免誤導。
 */

import type { BodyMetric, WaterLog } from "./schema";

// ---------------------------------------------------------------------------
// BMI
// ---------------------------------------------------------------------------

export type BmiCategory = "過輕" | "正常範圍" | "過重" | "肥胖";

export function calcBmi(weightKg: number | undefined, heightCm: number | undefined): number | undefined {
  if (!weightKg || !heightCm || heightCm <= 0) return undefined;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** 依台灣衛福部成人 BMI 分級標準。 */
export function bmiCategory(bmi: number | undefined): BmiCategory | undefined {
  if (bmi === undefined || Number.isNaN(bmi)) return undefined;
  if (bmi < 18.5) return "過輕";
  if (bmi < 24) return "正常範圍";
  if (bmi < 27) return "過重";
  return "肥胖";
}

// ---------------------------------------------------------------------------
// 日期
// ---------------------------------------------------------------------------

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / 86_400_000);
}

// ---------------------------------------------------------------------------
// 資料缺口偵測
// ---------------------------------------------------------------------------

/** 依日期排序（遞增）後的序列，找出間隔超過 thresholdDays 的缺口區間。 */
export function detectDateGaps(datesAsc: string[], thresholdDays = 4): Array<{ from: string; to: string; days: number }> {
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
// 趨勢摘要（保守：資料不足不下結論）
// ---------------------------------------------------------------------------

export interface TrendSummary {
  /** 是否有足夠資料點（≥3）供參考；不足時 UI 不應顯示任何升降判讀 */
  sufficient: boolean;
  deltaFromFirst?: number;
  latest?: number;
  first?: number;
  pointCount: number;
}

export function summarizeTrend(valuesAsc: number[]): TrendSummary {
  const pointCount = valuesAsc.length;
  if (pointCount === 0) {
    return { sufficient: false, pointCount };
  }
  const first = valuesAsc[0];
  const latest = valuesAsc[pointCount - 1];
  if (pointCount < 3 || first === undefined || latest === undefined) {
    return { sufficient: false, pointCount, first, latest };
  }
  return { sufficient: true, pointCount, first, latest, deltaFromFirst: latest - first };
}

// ---------------------------------------------------------------------------
// 數值格式化（tabular-nums 由 CSS class 負責，此處僅處理小數位）
// ---------------------------------------------------------------------------

export function formatNumber(value: number | undefined, digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  if (digits === 0) return value.toFixed(0);
  const fixed = value.toFixed(digits);
  return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
}

export function formatInt(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return String(Math.round(value));
}

// ---------------------------------------------------------------------------
// 依日期彙總（給圖表使用）
// ---------------------------------------------------------------------------

export function sortByDateAsc<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function sortByLoggedAtDesc<T extends { loggedAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : a.loggedAt > b.loggedAt ? -1 : 0));
}

export function withinLastDays<T extends { date: string }>(rows: T[], days: number): T[] {
  const cutoff = daysAgoIso(days);
  return rows.filter((r) => r.date >= cutoff);
}

/** 將 water_logs 依日期加總（毫升）。 */
export function sumWaterByDate(rows: WaterLog[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.date, (map.get(row.date) ?? 0) + row.amountMl);
  }
  return map;
}

/** 依 body_metrics 取得每筆的體重序列（依日期排序）。 */
export function weightSeries(rows: BodyMetric[]): Array<{ date: string; value: number; source: string }> {
  return sortByDateAsc(rows).map((r) => ({ date: r.date, value: r.weightKg, source: r.source }));
}
