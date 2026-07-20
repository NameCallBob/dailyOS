/**
 * lib/db.ts — 試用模式（Trial）本地資料庫。
 *
 * 使用 Dexie 包裝 IndexedDB，資料表名稱與 REST 資源名稱（`/api/v1/{name}/`）一一對應，
 * 由 resource.ts 依 `daios_mode` 選擇 Dexie 或 HTTP 實作。
 *
 * 規則：
 * - 所有表格皆以 `id` 為主鍵（uuid 字串）。
 * - 索引只加在會被查詢/排序的欄位；`deleted` 搭配 `updatedAt` 供軟刪除同步使用。
 * - Module agent 禁止修改本檔；如需新增欄位索引，回報 Foundation/主 Agent 統一調整並 bump version。
 */

import Dexie, { type Table } from "dexie";

import { getMode } from "./mode";

/**
 * 每個模式使用獨立的 IndexedDB，避免「試用假資料」污染「本機真實資料」：
 * - trial → DaiOSDB_trial（demo，可重置）
 * - local → DaiOSDB（你的真實資料）
 * auth 模式主要走 REST，不使用本地主資料庫。
 */
export const DB_NAME_TRIAL = "DaiOSDB_trial";
export const DB_NAME_LOCAL = "DaiOSDB";

export class DaiOSDB extends Dexie {
  // 工作
  tasks!: Table<Record<string, unknown>, string>;
  projects!: Table<Record<string, unknown>, string>;
  tags!: Table<Record<string, unknown>, string>;
  calendar_events!: Table<Record<string, unknown>, string>;
  timer_sessions!: Table<Record<string, unknown>, string>;
  time_entries!: Table<Record<string, unknown>, string>;

  // 個人
  notes!: Table<Record<string, unknown>, string>;
  note_versions!: Table<Record<string, unknown>, string>;
  habits!: Table<Record<string, unknown>, string>;
  habit_logs!: Table<Record<string, unknown>, string>;

  // 健康
  body_metrics!: Table<Record<string, unknown>, string>;
  water_logs!: Table<Record<string, unknown>, string>;
  meal_logs!: Table<Record<string, unknown>, string>;
  sleep_logs!: Table<Record<string, unknown>, string>;
  symptom_defs!: Table<Record<string, unknown>, string>;
  symptom_logs!: Table<Record<string, unknown>, string>;
  medications!: Table<Record<string, unknown>, string>;
  medication_schedules!: Table<Record<string, unknown>, string>;
  medication_logs!: Table<Record<string, unknown>, string>;
  supplements!: Table<Record<string, unknown>, string>;
  workouts!: Table<Record<string, unknown>, string>;
  workout_exercises!: Table<Record<string, unknown>, string>;
  workout_sets!: Table<Record<string, unknown>, string>;
  exercise_defs!: Table<Record<string, unknown>, string>;
  rehab_plans!: Table<Record<string, unknown>, string>;
  rehab_exercises!: Table<Record<string, unknown>, string>;
  rehab_sessions!: Table<Record<string, unknown>, string>;
  health_documents!: Table<Record<string, unknown>, string>;
  appointments!: Table<Record<string, unknown>, string>;

  // 系統 / 橫向
  activities!: Table<Record<string, unknown>, string>;
  user_profile!: Table<Record<string, unknown>, string>;
  user_preferences!: Table<Record<string, unknown>, string>;
  notification_prefs!: Table<Record<string, unknown>, string>;
  dashboard_layout!: Table<Record<string, unknown>, string>;

  constructor(dbName: string = DB_NAME_LOCAL) {
    super(dbName);

    this.version(1).stores({
      // 工作
      tasks: "id, projectId, status, dueDate, updatedAt, deleted",
      projects: "id, status, updatedAt, deleted",
      tags: "id, name, updatedAt, deleted",
      calendar_events: "id, startAt, endAt, updatedAt, deleted",
      timer_sessions: "id, taskId, startedAt, updatedAt, deleted",
      time_entries: "id, taskId, projectId, startAt, updatedAt, deleted",

      // 個人
      notes: "id, projectId, pinned, updatedAt, deleted",
      note_versions: "id, noteId, createdAt, updatedAt, deleted",
      habits: "id, archived, updatedAt, deleted",
      habit_logs: "id, habitId, date, updatedAt, deleted",

      // 健康
      body_metrics: "id, date, updatedAt, deleted",
      water_logs: "id, date, loggedAt, updatedAt, deleted",
      meal_logs: "id, date, loggedAt, updatedAt, deleted",
      sleep_logs: "id, date, updatedAt, deleted",
      symptom_defs: "id, name, updatedAt, deleted",
      symptom_logs: "id, symptomDefId, date, updatedAt, deleted",
      medications: "id, name, active, updatedAt, deleted",
      medication_schedules: "id, medicationId, updatedAt, deleted",
      medication_logs: "id, medicationId, scheduleId, takenAt, updatedAt, deleted",
      supplements: "id, name, active, updatedAt, deleted",
      workouts: "id, date, updatedAt, deleted",
      workout_exercises: "id, workoutId, exerciseDefId, updatedAt, deleted",
      workout_sets: "id, workoutExerciseId, updatedAt, deleted",
      exercise_defs: "id, name, category, updatedAt, deleted",
      rehab_plans: "id, active, updatedAt, deleted",
      rehab_exercises: "id, rehabPlanId, updatedAt, deleted",
      rehab_sessions: "id, rehabPlanId, date, updatedAt, deleted",
      health_documents: "id, date, category, updatedAt, deleted",
      appointments: "id, startAt, updatedAt, deleted",

      // 系統 / 橫向
      activities: "id, type, occurredAt, updatedAt, deleted",
      user_profile: "id, updatedAt, deleted",
      user_preferences: "id, updatedAt, deleted",
      notification_prefs: "id, updatedAt, deleted",
      dashboard_layout: "id, updatedAt, deleted",
    });
  }
}

/** 依資料庫名稱快取 Dexie 單例（trial / local 各一）。 */
const dbInstances = new Map<string, DaiOSDB>();

/** 依目前模式決定要使用哪個本地資料庫名稱。auth 模式不使用本地主庫，退回 local 名稱。 */
export function dbNameForMode(): string {
  return getMode() === "trial" ? DB_NAME_TRIAL : DB_NAME_LOCAL;
}

/**
 * 延遲建立單例；避免在 SSR/測試環境中直接觸碰 IndexedDB。
 * 依目前 daios_mode 選擇 trial / local 資料庫；也可傳入明確名稱（例如匯出全部）。
 */
export function getDb(dbName: string = dbNameForMode()): DaiOSDB {
  if (typeof indexedDB === "undefined") {
    throw new Error("DaiOSDB 僅可於瀏覽器環境使用（試用 / 本機模式）");
  }
  let instance = dbInstances.get(dbName);
  if (!instance) {
    instance = new DaiOSDB(dbName);
    dbInstances.set(dbName, instance);
  }
  return instance;
}

/** 所有已宣告的資料表名稱（供 resource.ts 型別檢查 / 除錯使用） */
export const DB_TABLE_NAMES = [
  "tasks",
  "projects",
  "tags",
  "calendar_events",
  "timer_sessions",
  "time_entries",
  "notes",
  "note_versions",
  "habits",
  "habit_logs",
  "body_metrics",
  "water_logs",
  "meal_logs",
  "sleep_logs",
  "symptom_defs",
  "symptom_logs",
  "medications",
  "medication_schedules",
  "medication_logs",
  "supplements",
  "workouts",
  "workout_exercises",
  "workout_sets",
  "exercise_defs",
  "rehab_plans",
  "rehab_exercises",
  "rehab_sessions",
  "health_documents",
  "appointments",
  "activities",
  "user_profile",
  "user_preferences",
  "notification_prefs",
  "dashboard_layout",
] as const;

export type DbTableName = (typeof DB_TABLE_NAMES)[number];
