/**
 * features/rehab/utils.ts — 日期／週彙總／格式化／CSV 匯出工具。
 *
 * 設計原則：本檔案只做「呈現用」的彙總與比較（例如不適感是否上升、完成率高低），
 * 一律唯讀、不回寫任何處方欄位；是否調整強度永遠由使用者決定。
 */

import type { RehabExercise, RehabPlan, RehabSession } from "./schema";

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

export function formatNumber(value: number | undefined, digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  if (digits === 0) return value.toFixed(0);
  const fixed = value.toFixed(digits);
  return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
}

/** ISO 8601 週次字串（西元年-第幾週），供每週彙總分組使用。 */
export function isoWeekKey(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // 週一 = 0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.valueOf() - firstThursday.valueOf();
  const week = 1 + Math.round(diff / (7 * 86_400_000));
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** 該週週一的日期（用於顯示「週次起始」）。 */
export function weekStartFromDate(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const dayNr = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayNr);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 復健項目狀態
// ---------------------------------------------------------------------------

/** 判斷項目在指定日期是否仍在處方期間內（生效日 ≤ date 且（無停止日 或 停止日 ≥ date））。 */
export function isExerciseActiveOn(exercise: RehabExercise, dateIso: string): boolean {
  if (exercise.effectiveDate > dateIso) return false;
  if (exercise.stopDate && exercise.stopDate < dateIso) return false;
  return true;
}

export function sortExercisesByOrder(exercises: RehabExercise[]): RehabExercise[] {
  return [...exercises].sort((a, b) => {
    const ao = a.order ?? 0;
    const bo = b.order ?? 0;
    if (ao !== bo) return ao - bo;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// 每週摘要
// ---------------------------------------------------------------------------

export interface WeeklySummaryRow {
  weekKey: string;
  weekStart: string;
  totalSessions: number;
  doneSessions: number;
  completionRate: number; // 0-100
  avgDiscomfortBefore?: number;
  avgDiscomfortAfter?: number;
}

export function buildWeeklySummary(sessions: RehabSession[]): WeeklySummaryRow[] {
  const groups = new Map<string, RehabSession[]>();
  for (const session of sessions) {
    const key = isoWeekKey(session.date);
    const bucket = groups.get(key) ?? [];
    bucket.push(session);
    groups.set(key, bucket);
  }

  const rows: WeeklySummaryRow[] = [];
  for (const [weekKey, rows_] of groups.entries()) {
    const totalSessions = rows_.length;
    const doneSessions = rows_.filter((s) => s.done).length;
    const beforeValues = rows_.map((s) => s.discomfortBefore).filter((v): v is number => v !== undefined);
    const afterValues = rows_.map((s) => s.discomfortAfter).filter((v): v is number => v !== undefined);
    const firstDate = rows_.reduce((min, s) => (s.date < min ? s.date : min), rows_[0]?.date ?? "");
    rows.push({
      weekKey,
      weekStart: weekStartFromDate(firstDate),
      totalSessions,
      doneSessions,
      completionRate: totalSessions > 0 ? Math.round((doneSessions / totalSessions) * 100) : 0,
      avgDiscomfortBefore: beforeValues.length > 0 ? beforeValues.reduce((a, b) => a + b, 0) / beforeValues.length : undefined,
      avgDiscomfortAfter: afterValues.length > 0 ? afterValues.reduce((a, b) => a + b, 0) / afterValues.length : undefined,
    });
  }

  return rows.sort((a, b) => (a.weekKey < b.weekKey ? 1 : a.weekKey > b.weekKey ? -1 : 0));
}

// ---------------------------------------------------------------------------
// CSV 匯出（純前端，不需後端支援）
// ---------------------------------------------------------------------------

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function sessionsToCsv(sessions: RehabSession[], exercisesById: Map<string, RehabExercise>): string {
  const header = [
    "日期",
    "項目",
    "是否完成",
    "實際組數",
    "實際次數",
    "實際時間(秒)",
    "執行前不適感(0-10)",
    "執行後不適感(0-10)",
    "負重/阻力",
    "備註",
  ];
  const lines = [header.map(csvEscape).join(",")];
  const sorted = [...sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const s of sorted) {
    const exerciseName = exercisesById.get(s.rehabExerciseId)?.name ?? "（已刪除項目）";
    lines.push(
      [
        s.date,
        exerciseName,
        s.done ? "是" : "否",
        s.actualSets !== undefined ? String(s.actualSets) : "",
        s.actualReps !== undefined ? String(s.actualReps) : "",
        s.actualTime !== undefined ? String(s.actualTime) : "",
        s.discomfortBefore !== undefined ? String(s.discomfortBefore) : "",
        s.discomfortAfter !== undefined ? String(s.discomfortAfter) : "",
        s.load ?? "",
        s.notes ?? "",
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// 時間線（回診紀錄 + 計畫 / 項目重要事件）
// ---------------------------------------------------------------------------

export interface TimelineEvent {
  id: string;
  date: string;
  kind: "plan-start" | "review" | "exercise-start" | "exercise-stop";
  title: string;
  description?: string;
  adjustment?: boolean;
}

export function buildTimeline(plan: RehabPlan, exercises: RehabExercise[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: `${plan.id}-start`,
    date: plan.startDate,
    kind: "plan-start",
    title: "計畫開始",
    description: plan.diagnosis ? `診斷／原因：${plan.diagnosis}` : undefined,
  });

  for (const review of plan.reviewNotes) {
    events.push({
      id: review.id,
      date: review.date,
      kind: "review",
      title: review.adjustment ? "回診（含處方調整）" : "回診紀錄",
      description: review.note,
      adjustment: review.adjustment,
    });
  }

  for (const exercise of exercises) {
    events.push({
      id: `${exercise.id}-effective`,
      date: exercise.effectiveDate,
      kind: "exercise-start",
      title: `新增項目：${exercise.name}`,
      description: exercise.therapistNote,
    });
    if (exercise.stopDate) {
      events.push({
        id: `${exercise.id}-stop`,
        date: exercise.stopDate,
        kind: "exercise-stop",
        title: `停止項目：${exercise.name}`,
      });
    }
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
