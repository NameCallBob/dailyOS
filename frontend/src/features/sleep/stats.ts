/**
 * features/sleep/stats.ts — 每週平均、作息規律度、以及睡眠 × 專注／運動 關聯計算。
 *
 * 重要原則（架構要求）：關聯分析只描述「相關性」，不得宣稱因果。
 * 因此本檔所有關聯輸出都附帶樣本數與保守用語，UI 端須原樣呈現免責提示，
 * 不可將相關係數包裝成「睡眠導致…」之類的因果陳述。
 */

import type { TimeEntryLite, WorkoutLite } from "./resource";
import type { SleepLog } from "./schema";
import { mean, minutesSinceNoon, sortByDateAsc, stddev, withinLastDays } from "./utils";

// ---------------------------------------------------------------------------
// 每週平均
// ---------------------------------------------------------------------------

export interface WeeklyAverage {
  count: number;
  avgHours?: number;
  avgQuality?: number;
  avgAwakenings?: number;
  avgMorningEnergy?: number;
  /** 與前一週期的時數差（需兩期皆有資料才提供） */
  deltaHours?: number;
}

export function computeWeeklyAverage(logs: SleepLog[], windowDays = 7): WeeklyAverage {
  const current = withinLastDays(logs, windowDays);
  if (current.length === 0) return { count: 0 };

  const previousWindow = logs.filter((l) => {
    const daysAgo = Math.floor((Date.now() - new Date(`${l.date}T00:00:00`).getTime()) / 86_400_000);
    return daysAgo >= windowDays && daysAgo < windowDays * 2;
  });

  const avgHours = mean(current.map((l) => l.hours));
  const avgQuality = mean(current.map((l) => l.quality));
  const avgAwakenings = mean(current.map((l) => l.awakenings));
  const avgMorningEnergy = mean(current.map((l) => l.morningEnergy));

  const result: WeeklyAverage = {
    count: current.length,
    avgHours,
    avgQuality,
    avgAwakenings,
    avgMorningEnergy,
  };

  if (previousWindow.length > 0) {
    result.deltaHours = avgHours - mean(previousWindow.map((l) => l.hours));
  }

  return result;
}

// ---------------------------------------------------------------------------
// 作息規律度
// ---------------------------------------------------------------------------

export type RegularityLabel = "非常規律" | "尚稱規律" | "不規律" | "資料不足";

export interface RegularityResult {
  sufficient: boolean;
  sampleCount: number;
  label: RegularityLabel;
  /** 0~100，數值越高代表上床／起床時間越一致；資料不足時為 undefined */
  score?: number;
  bedtimeStdDevMinutes?: number;
  wakeStdDevMinutes?: number;
}

const MIN_REGULARITY_SAMPLES = 4;

export function computeRegularity(logs: SleepLog[], windowDays = 14): RegularityResult {
  const window = withinLastDays(logs, windowDays);
  if (window.length < MIN_REGULARITY_SAMPLES) {
    return { sufficient: false, sampleCount: window.length, label: "資料不足" };
  }

  const bedtimeMinutes = window.map((l) => minutesSinceNoon(l.bedtime));
  const wakeMinutes = window.map((l) => minutesSinceNoon(l.wakeAt));
  const bedtimeStdDevMinutes = Math.round(stddev(bedtimeMinutes));
  const wakeStdDevMinutes = Math.round(stddev(wakeMinutes));
  const avgStdDev = (bedtimeStdDevMinutes + wakeStdDevMinutes) / 2;

  // 標準差 0 分鐘 = 100 分；每偏移 1.2 分鐘扣 1 分，最低 0 分（純粹是畫面呈現用的線性換算，非醫學量表）。
  const score = Math.max(0, Math.round(100 - avgStdDev / 1.2));

  let label: RegularityLabel;
  if (score >= 75) label = "非常規律";
  else if (score >= 50) label = "尚稱規律";
  else label = "不規律";

  return {
    sufficient: true,
    sampleCount: window.length,
    label,
    score,
    bedtimeStdDevMinutes,
    wakeStdDevMinutes,
  };
}

// ---------------------------------------------------------------------------
// 趨勢序列（供折線圖）
// ---------------------------------------------------------------------------

export interface TrendPoint {
  date: string;
  hours: number;
  quality: number;
}

export function buildTrendSeries(logs: SleepLog[], windowDays = 30): TrendPoint[] {
  const window = withinLastDays(logs, windowDays);
  return sortByDateAsc(window).map((l) => ({ date: l.date, hours: l.hours, quality: l.quality }));
}

// ---------------------------------------------------------------------------
// 關聯分析：睡眠時數 × 隔天專注／運動
// ---------------------------------------------------------------------------

export interface CorrelationPoint {
  date: string;
  sleepHours: number;
  focusMinutes: number;
  hasWorkout: boolean;
}

const MIN_CORRELATION_SAMPLES = 5;

/** 皮爾森相關係數；樣本數不足或無變異時回傳 undefined。 */
export function pearsonCorrelation(xs: number[], ys: number[]): number | undefined {
  const n = xs.length;
  if (n < MIN_CORRELATION_SAMPLES || n !== ys.length) return undefined;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (xs[i] ?? 0) - mx;
    const dy = (ys[i] ?? 0) - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return undefined;
  return num / Math.sqrt(dx2 * dy2);
}

export function correlationStrengthLabel(r: number | undefined): string {
  if (r === undefined) return "資料不足，尚無法判斷";
  const abs = Math.abs(r);
  const direction = r >= 0 ? "正相關" : "負相關";
  if (abs < 0.2) return "幾乎無關聯";
  if (abs < 0.4) return `弱${direction}`;
  if (abs < 0.6) return `中度${direction}`;
  return `強${direction}`;
}

export interface CorrelationResult {
  points: CorrelationPoint[];
  sampleCount: number;
  focusCorrelation?: number;
  avgSleepHoursOnWorkoutDays?: number;
  avgSleepHoursOnRestDays?: number;
  workoutDayCount: number;
  restDayCount: number;
}

/**
 * 將「當天睡眠時數」與「當天專注時數 / 是否有運動紀錄」配對（同一 date），
 * 用以觀察兩者是否同向變化——僅描述相關性，畫面文案不得改寫成因果語句。
 */
export function buildCorrelation(
  sleepLogs: SleepLog[],
  timeEntries: TimeEntryLite[],
  workouts: WorkoutLite[],
  windowDays = 30,
): CorrelationResult {
  const sleepWindow = withinLastDays(sleepLogs, windowDays);

  const focusMinutesByDate = new Map<string, number>();
  for (const entry of timeEntries) {
    if (entry.deleted) continue;
    const date = entry.startAt?.slice(0, 10);
    if (!date) continue;
    focusMinutesByDate.set(date, (focusMinutesByDate.get(date) ?? 0) + entry.durationSeconds / 60);
  }

  const workoutDates = new Set<string>();
  for (const w of workouts) {
    if (w.deleted) continue;
    if (w.date) workoutDates.add(w.date);
  }

  const points: CorrelationPoint[] = sortByDateAsc(sleepWindow).map((log) => ({
    date: log.date,
    sleepHours: log.hours,
    focusMinutes: Math.round(focusMinutesByDate.get(log.date) ?? 0),
    hasWorkout: workoutDates.has(log.date),
  }));

  const withFocusData = points.filter((p) => focusMinutesByDate.has(p.date));
  const focusCorrelation = pearsonCorrelation(
    withFocusData.map((p) => p.sleepHours),
    withFocusData.map((p) => p.focusMinutes),
  );

  const workoutDayHours = points.filter((p) => p.hasWorkout).map((p) => p.sleepHours);
  const restDayHours = points.filter((p) => !p.hasWorkout).map((p) => p.sleepHours);

  return {
    points,
    sampleCount: points.length,
    focusCorrelation,
    avgSleepHoursOnWorkoutDays: workoutDayHours.length > 0 ? mean(workoutDayHours) : undefined,
    avgSleepHoursOnRestDays: restDayHours.length > 0 ? mean(restDayHours) : undefined,
    workoutDayCount: workoutDayHours.length,
    restDayCount: restDayHours.length,
  };
}
