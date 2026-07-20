/**
 * features/workouts/utils.ts — 日期、格式化、訓練容量／PR／週統計等純函式。
 */

import type { Workout, WorkoutExercise, WorkoutSet } from "./schema";
import { CARDIO_TYPES } from "./types";

// ---------------------------------------------------------------------------
// 日期
// ---------------------------------------------------------------------------

export function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function todayIsoDate(): string {
  return isoDateDaysAgo(0);
}

export function combineDateTime(dateIso: string, time: string): string {
  return new Date(`${dateIso}T${time || "00:00"}:00`).toISOString();
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function formatDateLong(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return `${d.getMonth() + 1}/${d.getDate()} (週${WEEKDAY_LABELS[d.getDay()]})`;
}

export function formatDateShort(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** ISO 8601 週一為起始的當週起始日期（YYYY-MM-DD）。 */
export function startOfIsoWeek(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function withinLastDays<T extends { date: string }>(rows: T[], days: number): T[] {
  const cutoff = isoDateDaysAgo(days - 1);
  return rows.filter((r) => r.date >= cutoff);
}

export function sortByDateAsc<T extends { date: string; startAt?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.startAt ?? "") < (b.startAt ?? "") ? -1 : 1;
  });
}

// ---------------------------------------------------------------------------
// 數值格式
// ---------------------------------------------------------------------------

export function formatInt(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("zh-TW");
}

export function formatDecimal(n: number | undefined, digits = 1): string {
  if (n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("zh-TW", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 配速 min/km -> "5'30" */
export function formatPace(minPerKm: number | undefined): string {
  if (minPerKm === undefined || Number.isNaN(minPerKm) || minPerKm <= 0) return "—";
  const totalSec = Math.round(minPerKm * 60);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}'${String(sec).padStart(2, "0")}"`;
}

export function isCardioType(type: Workout["type"]): boolean {
  return CARDIO_TYPES.has(type);
}

// ---------------------------------------------------------------------------
// 訓練容量 / 1RM / PR
// ---------------------------------------------------------------------------

/** 單組訓練容量（reps x weight），暖身組不計入。 */
export function setVolume(set: WorkoutSet): number {
  if (set.isWarmup) return 0;
  return (set.reps ?? 0) * (set.weightKg ?? 0);
}

export function totalVolume(sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0);
}

/** Epley 公式估算單次最大重量（1RM），用於跨動作比較「個人最佳」。 */
export function estimate1Rm(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

export interface PersonalBest {
  exerciseDefId: string;
  set: WorkoutSet;
  workoutExercise: WorkoutExercise;
  estimated1Rm: number;
  achievedDate: string;
}

/**
 * 依「估算 1RM」找出每個動作的個人最佳組數。
 * `setDates`：workoutExerciseId -> 所屬 workout 的日期，用於顯示達成日期。
 */
export function computePersonalBests(
  sets: WorkoutSet[],
  workoutExercises: WorkoutExercise[],
  workoutDateByExerciseId: Map<string, string>,
): PersonalBest[] {
  const weByAny = new Map(workoutExercises.map((we) => [we.id, we]));
  const best = new Map<string, PersonalBest>();

  for (const set of sets) {
    if (set.isWarmup || !set.weightKg || !set.reps) continue;
    const we = weByAny.get(set.workoutExerciseId);
    if (!we) continue;
    const est = estimate1Rm(set.weightKg, set.reps);
    const current = best.get(we.exerciseDefId);
    if (!current || est > current.estimated1Rm) {
      best.set(we.exerciseDefId, {
        exerciseDefId: we.exerciseDefId,
        set,
        workoutExercise: we,
        estimated1Rm: est,
        achievedDate: workoutDateByExerciseId.get(we.id) ?? "",
      });
    }
  }

  return [...best.values()].sort((a, b) => b.estimated1Rm - a.estimated1Rm);
}

// ---------------------------------------------------------------------------
// 每週統計 / 恢復日
// ---------------------------------------------------------------------------

export interface WeeklyStat {
  weekStart: string;
  totalMinutes: number;
  totalVolume: number;
  workoutCount: number;
}

export function groupByWeek(workouts: Array<Workout & { volume?: number }>): WeeklyStat[] {
  const map = new Map<string, WeeklyStat>();
  for (const w of workouts) {
    const weekStart = startOfIsoWeek(w.date);
    const existing = map.get(weekStart) ?? { weekStart, totalMinutes: 0, totalVolume: 0, workoutCount: 0 };
    existing.totalMinutes += w.durationMin;
    existing.totalVolume += w.volume ?? 0;
    existing.workoutCount += 1;
    map.set(weekStart, existing);
  }
  return [...map.values()].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

export interface RecoveryDay {
  date: string;
  hasWorkout: boolean;
  types: string[];
}

/** 近 N 天每天是否有訓練，供「恢復日」日曆式呈現與連續訓練天數警示使用。 */
export function buildRecoveryDays(workouts: Workout[], days: number): RecoveryDay[] {
  const byDate = new Map<string, string[]>();
  for (const w of workouts) {
    const list = byDate.get(w.date) ?? [];
    list.push(w.type);
    byDate.set(w.date, list);
  }
  const out: RecoveryDay[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = isoDateDaysAgo(i);
    const types = byDate.get(date) ?? [];
    out.push({ date, hasWorkout: types.length > 0, types });
  }
  return out;
}

/** 目前連續訓練天數（不含今日若今日尚未訓練）。 */
export function currentTrainingStreak(recoveryDays: RecoveryDay[]): number {
  let streak = 0;
  for (let i = recoveryDays.length - 1; i >= 0; i -= 1) {
    const day = recoveryDays[i];
    if (!day?.hasWorkout) break;
    streak += 1;
  }
  return streak;
}

// ---------------------------------------------------------------------------
// 部位分布
// ---------------------------------------------------------------------------

export interface CategoryDistributionEntry {
  category: string;
  volume: number;
  setCount: number;
}

export function computeCategoryDistribution(
  sets: WorkoutSet[],
  workoutExercises: WorkoutExercise[],
  categoryByExerciseId: Map<string, string>,
): CategoryDistributionEntry[] {
  const weById = new Map(workoutExercises.map((we) => [we.id, we]));
  const map = new Map<string, CategoryDistributionEntry>();
  for (const set of sets) {
    if (set.isWarmup) continue;
    const we = weById.get(set.workoutExerciseId);
    if (!we) continue;
    const category = categoryByExerciseId.get(we.exerciseDefId) ?? "其他";
    const entry = map.get(category) ?? { category, volume: 0, setCount: 0 };
    entry.volume += setVolume(set);
    entry.setCount += 1;
    map.set(category, entry);
  }
  return [...map.values()].sort((a, b) => b.volume - a.volume);
}
