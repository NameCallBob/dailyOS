/**
 * features/dashboard/types.ts — 總覽模組的記錄型別。
 *
 * 重要：總覽會「讀取」（部分小工具也會寫入，如標記任務完成／習慣打卡）多個其他
 * 模組擁有的資料表（tasks、calendar_events…）。這些資料表的 seed／schema 一律
 * 以「擁有該模組」的定義為準（見 features/dashboard/resources.ts 直接重用各模組
 * 匯出的 repo），本檔案不再自行定義一份不同形狀的型別子集 ——
 * 過去這裡曾各自宣告過一份精簡型別＋seed，與擁有模組的真實 schema 欄位、enum
 * 不一致，且 lib/resource.ts 的 lazy-seed 以「哪個模組先讀到空表」決定寫入形狀，
 * 兩份不同形狀的 seed 互相競爭會讓其中一個模組讀到壞資料而整頁壞掉。
 * 因此這裡直接 re-export 各擁有模組的型別，確保全站只有一份形狀。
 */

import type { BaseRecord } from "@/lib/types";

export type { Task } from "@/features/tasks/types";
export type { CalendarEvent } from "@/features/calendar/schema";
export type { TimerSession } from "@/features/focus/types";
export type { Habit, HabitLog } from "@/features/habits/types";
export type { WaterLog, BodyMetric } from "@/features/body/schema";
export type { Note } from "@/features/notes/types";
export type { Workout } from "@/features/workouts/schema";
export type { SleepLog } from "@/features/sleep/schema";
export type { MealLog } from "@/features/nutrition/types";
export type { SymptomLog } from "@/features/symptoms/schema";

// --- 總覽版面設定（本模組擁有／可寫入的資料表） -----------------------------

export const WIDGET_KEYS = [
  "greeting",
  "quickAdd",
  "topTasks",
  "todaySchedule",
  "overdueTasks",
  "activeTimer",
  "completionRate",
  "water",
  "activity",
  "healthStatus",
  "habits",
  "suggestions",
  "recentNotes",
] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];

export interface DashboardWidgetConfig {
  key: WidgetKey;
  visible: boolean;
  order: number;
}

export interface DashboardLayoutRecord extends BaseRecord {
  widgets: DashboardWidgetConfig[];
}

export interface SuggestionItem {
  id: string;
  title: string;
  reason: string;
  tone: "accent" | "warning" | "danger";
}
