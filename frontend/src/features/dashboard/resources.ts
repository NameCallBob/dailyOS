/**
 * features/dashboard/resources.ts — 總覽模組的所有資料存取入口。
 *
 * dashboard_layout：本模組唯一擁有、可寫入的資料表，完整 CRUD + seed。
 *
 * 其餘資料表（tasks、calendar_events、timer_sessions、habits、habit_logs、
 * water_logs、notes、workouts、body_metrics、sleep_logs、meal_logs、
 * symptom_logs）皆由對應模組擁有；總覽只「讀取」（少數小工具也會寫入，如
 * 標記任務完成、習慣打卡），因此一律直接重用各擁有模組匯出的 repo 實例，
 * 不再自行呼叫 createResource() 建立第二份定義 —— 否則會與擁有模組的
 * schema／seed 形狀不一致，且 lib/resource.ts 的 lazy-seed 以「哪個模組先讀到
 * 空表」決定實際寫入的資料形狀，兩份不同形狀的 seed 互相競爭會讓其中一個模組
 * 讀到壞資料而整頁壞掉（例如缺少必要欄位造成 .map() 對 undefined 報錯）。
 */

import { z } from "zod";

import { createResource } from "@/lib/resource";

import { bodyMetricsResource, waterLogsResource } from "@/features/body/resources";
import { calendarEventsResource } from "@/features/calendar/resource";
import { timerSessionsResource } from "@/features/focus/api";
import { habitLogsRepo, habitsRepo } from "@/features/habits/repo";
import { mealLogsResource } from "@/features/nutrition/resource";
import { notesRepo } from "@/features/notes/repo";
import { sleepLogsResource } from "@/features/sleep/resource";
import { symptomLogsResource } from "@/features/symptoms/resources";
import { tasksRepo } from "@/features/tasks/repo";
import { workoutsResource } from "@/features/workouts/resources";

import type { DashboardLayoutRecord, WidgetKey } from "./types";
import { DEFAULT_WIDGET_ORDER } from "./layout";

const baseFields = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
});

function seedBase(id: string, at: Date) {
  const iso = at.toISOString();
  return { id, createdAt: iso, updatedAt: iso, version: 1, deleted: false };
}

// ---------------------------------------------------------------------------
// dashboard_layout — 本模組擁有，唯一會被寫入的資料表
// ---------------------------------------------------------------------------

export const DEFAULT_LAYOUT_ID = "dashboard-layout-default";

export const dashboardLayoutSchema: z.ZodType<DashboardLayoutRecord> = baseFields.extend({
  widgets: z.array(
    z.object({
      key: z.string(),
      visible: z.boolean(),
      order: z.number(),
    }),
  ),
}) as unknown as z.ZodType<DashboardLayoutRecord>;

function seedDashboardLayout(): DashboardLayoutRecord[] {
  const now = new Date();
  return [
    {
      ...seedBase(DEFAULT_LAYOUT_ID, now),
      widgets: DEFAULT_WIDGET_ORDER.map((key: WidgetKey, index) => ({
        key,
        visible: true,
        order: index,
      })),
    },
  ];
}

export const dashboardLayoutResource = createResource<DashboardLayoutRecord>({
  name: "dashboard_layout",
  schema: dashboardLayoutSchema,
  seed: seedDashboardLayout,
});

// ---------------------------------------------------------------------------
// 其餘資料表：直接重用擁有模組的 repo（同一個 Repo 實例，唯一資料形狀來源）
// ---------------------------------------------------------------------------

export const tasksResource = tasksRepo;
export { calendarEventsResource };
export { timerSessionsResource };
export const habitsResource = habitsRepo;
export const habitLogsResource = habitLogsRepo;
export { waterLogsResource };
export const notesResource = notesRepo;
export { workoutsResource };
export { bodyMetricsResource };
export { sleepLogsResource };
export { mealLogsResource };
export { symptomLogsResource };
