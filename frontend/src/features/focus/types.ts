/**
 * features/focus/types.ts — 專注模組資料模型（timer_sessions / time_entries）。
 *
 * timer_sessions：計時器本身的生命週期（start/pause/resume/stop/cancel）。
 * time_entries  ：已完成的時間區段記錄（由計時器 stop 產生，或手動補登），
 *                 是每日/每週/月度統計的資料來源。
 *
 * 經過時間規則：`accumulatedSeconds` 為「非執行中」已累積的秒數；若 status === "running"，
 * 目前這一段的秒數一律由 `startedAt`（ISO 時間戳）與當下時間差計算，
 * 不在前端用計時器逐秒累加變數，因此重新整理頁面也不會失真。
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// 基礎欄位
// ---------------------------------------------------------------------------

export const baseRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
  deleted: z.boolean(),
});

// ---------------------------------------------------------------------------
// 分類 / 列舉
// ---------------------------------------------------------------------------

export const FOCUS_CATEGORY_VALUES = [
  "pomodoro",
  "deep_work",
  "meeting",
  "study",
  "admin",
  "exercise",
  "break",
  "other",
] as const;

export const focusCategorySchema = z.enum(FOCUS_CATEGORY_VALUES);
export type FocusCategory = z.infer<typeof focusCategorySchema>;

export const FOCUS_CATEGORY_LABELS: Record<FocusCategory, string> = {
  pomodoro: "番茄鐘",
  deep_work: "深度工作",
  meeting: "會議",
  study: "學習",
  admin: "行政雜務",
  exercise: "運動",
  break: "休息",
  other: "其他",
};

export const FOCUS_CATEGORY_OPTIONS = FOCUS_CATEGORY_VALUES.map((value) => ({
  value,
  label: FOCUS_CATEGORY_LABELS[value],
}));

export const timerModeSchema = z.enum(["stopwatch", "pomodoro"]);
export type TimerMode = z.infer<typeof timerModeSchema>;

export const timerStatusSchema = z.enum(["running", "paused", "completed", "cancelled"]);
export type TimerStatus = z.infer<typeof timerStatusSchema>;

export const pomodoroPhaseSchema = z.enum(["focus", "short_break", "long_break"]);
export type PomodoroPhase = z.infer<typeof pomodoroPhaseSchema>;

// ---------------------------------------------------------------------------
// timer_sessions
// ---------------------------------------------------------------------------

export const timerSessionSchema = baseRecordSchema.extend({
  label: z.string().min(1, "請輸入名稱").max(120),
  category: focusCategorySchema.default("deep_work"),
  taskId: z.string().nullable().default(null),
  projectId: z.string().nullable().default(null),
  status: timerStatusSchema,
  mode: timerModeSchema.default("stopwatch"),
  /** 目標秒數（番茄鐘/倒數模式使用；碼表模式為 null） */
  targetSeconds: z.number().int().positive().nullable().default(null),
  /** 此次會話真正開始的時間（建立時寫入，不因暫停/恢復而改變） */
  sessionStartAt: z.string(),
  /** 非執行中已累積秒數（每次 pause / stop 時把當前運行段落加總進來） */
  accumulatedSeconds: z.number().int().nonnegative().default(0),
  /** 目前執行段落的起始時間戳；status !== "running" 時為 null */
  startedAt: z.string().nullable(),
  pausedAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  pomodoroPhase: pomodoroPhaseSchema.nullable().default(null),
  /** 此計時器（含其後續的休息段落）已完成的番茄鐘輪數 */
  pomodoroCount: z.number().int().nonnegative().default(0),
  note: z.string().max(500).default(""),
});

export type TimerSession = z.infer<typeof timerSessionSchema>;

// ---------------------------------------------------------------------------
// time_entries
// ---------------------------------------------------------------------------

export const timeEntrySchema = baseRecordSchema.extend({
  label: z.string().min(1, "請輸入名稱").max(120),
  category: focusCategorySchema.default("deep_work"),
  taskId: z.string().nullable().default(null),
  projectId: z.string().nullable().default(null),
  timerSessionId: z.string().nullable().default(null),
  startAt: z.string(),
  endAt: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  source: z.enum(["timer", "manual"]),
  note: z.string().max(500).default(""),
});

export type TimeEntry = z.infer<typeof timeEntrySchema>;

// ---------------------------------------------------------------------------
// 衍生工具
// ---------------------------------------------------------------------------

/** 計算 timer_session 目前的總經過秒數（執行中段落即時計算，非前端累加狀態）。 */
export function computeElapsedSeconds(session: Pick<TimerSession, "status" | "startedAt" | "accumulatedSeconds">, now: number = Date.now()): number {
  if (session.status === "running" && session.startedAt) {
    const startedMs = new Date(session.startedAt).getTime();
    const running = Math.max(0, Math.floor((now - startedMs) / 1000));
    return session.accumulatedSeconds + running;
  }
  return session.accumulatedSeconds;
}

export const POMODORO_DEFAULTS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
} as const;
