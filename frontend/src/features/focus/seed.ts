/**
 * features/focus/seed.ts — 試用模式種子資料（近 30 天分布，繁體中文內容）。
 */

import type { FocusCategory, TimeEntry, TimerSession } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoAt(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setTime(d.getTime() - daysAgo * DAY_MS);
  return d.toISOString();
}

function addSeconds(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

interface SeedSessionDef {
  id: string;
  label: string;
  category: FocusCategory;
  mode: "stopwatch" | "pomodoro";
  daysAgo: number;
  hour: number;
  minute: number;
  durationSeconds: number;
  status: "completed" | "cancelled" | "paused";
  targetSeconds?: number;
  note?: string;
}

const SESSION_DEFS: SeedSessionDef[] = [
  {
    id: "seed-ts-1",
    label: "季度報告撰寫",
    category: "deep_work",
    mode: "stopwatch",
    daysAgo: 1,
    hour: 9,
    minute: 5,
    durationSeconds: 92 * 60,
    status: "completed",
    note: "整理第二季數據並完成初稿",
  },
  {
    id: "seed-ts-2",
    label: "英文單字複習",
    category: "study",
    mode: "pomodoro",
    daysAgo: 2,
    hour: 20,
    minute: 30,
    durationSeconds: 25 * 60,
    status: "completed",
    targetSeconds: 25 * 60,
  },
  {
    id: "seed-ts-3",
    label: "產品需求討論會議",
    category: "meeting",
    mode: "stopwatch",
    daysAgo: 3,
    hour: 14,
    minute: 0,
    durationSeconds: 48 * 60,
    status: "completed",
  },
  {
    id: "seed-ts-4",
    label: "程式碼審查",
    category: "deep_work",
    mode: "pomodoro",
    daysAgo: 5,
    hour: 10,
    minute: 15,
    durationSeconds: 25 * 60,
    status: "completed",
    targetSeconds: 25 * 60,
  },
  {
    id: "seed-ts-5",
    label: "側身棄用需求（放棄的嘗試）",
    category: "admin",
    mode: "stopwatch",
    daysAgo: 6,
    hour: 16,
    minute: 40,
    durationSeconds: 6 * 60,
    status: "cancelled",
    note: "中途被會議打斷，取消此次計時",
  },
  {
    id: "seed-ts-6",
    label: "晨間跑步",
    category: "exercise",
    mode: "stopwatch",
    daysAgo: 8,
    hour: 6,
    minute: 30,
    durationSeconds: 34 * 60,
    status: "completed",
  },
  {
    id: "seed-ts-7",
    label: "讀書會準備",
    category: "study",
    mode: "stopwatch",
    daysAgo: 11,
    hour: 21,
    minute: 0,
    durationSeconds: 55 * 60,
    status: "completed",
  },
  {
    id: "seed-ts-8",
    label: "年度企劃深度工作",
    category: "deep_work",
    mode: "pomodoro",
    daysAgo: 0,
    hour: 15,
    minute: 10,
    durationSeconds: 14 * 60,
    status: "paused",
    targetSeconds: 25 * 60,
  },
];

export function seedTimerSessions(): TimerSession[] {
  return SESSION_DEFS.map((def) => {
    const sessionStartAt = isoAt(def.daysAgo, def.hour, def.minute);
    const isPaused = def.status === "paused";
    const completedAt = isPaused ? null : addSeconds(sessionStartAt, def.durationSeconds);
    return {
      id: def.id,
      createdAt: sessionStartAt,
      updatedAt: completedAt ?? sessionStartAt,
      version: 1,
      deleted: false,
      label: def.label,
      category: def.category,
      taskId: null,
      projectId: null,
      status: def.status,
      mode: def.mode,
      targetSeconds: def.targetSeconds ?? null,
      sessionStartAt,
      accumulatedSeconds: def.durationSeconds,
      startedAt: null,
      pausedAt: isPaused ? addSeconds(sessionStartAt, def.durationSeconds) : null,
      completedAt,
      pomodoroPhase: def.mode === "pomodoro" ? "focus" : null,
      pomodoroCount: def.mode === "pomodoro" && def.status === "completed" ? 1 : 0,
      note: def.note ?? "",
    } satisfies TimerSession;
  });
}

interface SeedManualEntryDef {
  label: string;
  category: FocusCategory;
  daysAgo: number;
  hour: number;
  minute: number;
  durationSeconds: number;
  note?: string;
}

const MANUAL_ENTRY_DEFS: SeedManualEntryDef[] = [
  { label: "客戶提案簡報練習", category: "deep_work", daysAgo: 4, hour: 11, minute: 0, durationSeconds: 40 * 60 },
  { label: "整理發票與報帳", category: "admin", daysAgo: 4, hour: 17, minute: 20, durationSeconds: 20 * 60 },
  { label: "冥想與伸展", category: "break", daysAgo: 9, hour: 7, minute: 0, durationSeconds: 15 * 60 },
  { label: "團隊週會", category: "meeting", daysAgo: 10, hour: 9, minute: 30, durationSeconds: 30 * 60 },
  { label: "瑜伽課", category: "exercise", daysAgo: 13, hour: 19, minute: 0, durationSeconds: 50 * 60 },
  { label: "線上課程：資料結構", category: "study", daysAgo: 15, hour: 21, minute: 30, durationSeconds: 45 * 60 },
  { label: "補記：機場候機閱讀", category: "other", daysAgo: 18, hour: 8, minute: 10, durationSeconds: 60 * 60, note: "手動補登，忘記啟動計時器" },
  { label: "月度財務結算", category: "admin", daysAgo: 21, hour: 13, minute: 45, durationSeconds: 35 * 60 },
  { label: "設計評審會議", category: "meeting", daysAgo: 24, hour: 15, minute: 0, durationSeconds: 25 * 60 },
];

export function seedTimeEntries(): TimeEntry[] {
  const fromSessions: TimeEntry[] = SESSION_DEFS.filter((d) => d.status === "completed").map((def, index) => {
    const startAt = isoAt(def.daysAgo, def.hour, def.minute);
    const endAt = addSeconds(startAt, def.durationSeconds);
    return {
      id: `seed-te-session-${index + 1}`,
      createdAt: endAt,
      updatedAt: endAt,
      version: 1,
      deleted: false,
      label: def.label,
      category: def.category,
      taskId: null,
      projectId: null,
      timerSessionId: def.id,
      startAt,
      endAt,
      durationSeconds: def.durationSeconds,
      source: "timer",
      note: def.note ?? "",
    } satisfies TimeEntry;
  });

  const manual: TimeEntry[] = MANUAL_ENTRY_DEFS.map((def, index) => {
    const startAt = isoAt(def.daysAgo, def.hour, def.minute);
    const endAt = addSeconds(startAt, def.durationSeconds);
    return {
      id: `seed-te-manual-${index + 1}`,
      createdAt: endAt,
      updatedAt: endAt,
      version: 1,
      deleted: false,
      label: def.label,
      category: def.category,
      taskId: null,
      projectId: null,
      timerSessionId: null,
      startAt,
      endAt,
      durationSeconds: def.durationSeconds,
      source: "manual",
      note: def.note ?? "",
    } satisfies TimeEntry;
  });

  return [...fromSessions, ...manual];
}
