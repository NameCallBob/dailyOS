/**
 * features/sleep/resource.ts — 本模組的 createResource 綁定。
 *
 * sleep_logs：完整 CRUD（試用走 Dexie + seed，登入走 /api/v1/sleep_logs/）。
 *
 * 另外提供兩個「唯讀」關聯資源（time_entries / workouts），供睡眠 × 專注／運動 關聯圖使用：
 * - 不傳入 seed（避免與「專注」「運動」模組各自的種子資料互相覆蓋或重覆寫入）。
 * - 這兩個資料表已於 lib/db.ts 預先宣告；欄位定義以寬鬆型別讀取即可，
 *   因為 resource.ts 的 list() 不會對讀出資料做 zod 驗證（驗證僅發生在 create/update，
 *   本模組完全不對這兩個資源執行寫入）。
 * - 若對應模組尚未建置或尚無資料，畫面會顯示「資料不足」而非硬性等待，符合關聯分析
 *   「只描述相關性、不宣稱因果」且必須誠實呈現樣本量的原則。
 */

import { z } from "zod";

import { createResource } from "@/lib/resource";

import { sleepLogSchema, type SleepLog } from "./schema";
import { seedSleepLogs } from "./seed";

export const sleepLogsResource = createResource<SleepLog>({
  name: "sleep_logs",
  schema: sleepLogSchema,
  seed: seedSleepLogs,
});

// ---------------------------------------------------------------------------
// 唯讀關聯資料源（專注 / 運動）
// ---------------------------------------------------------------------------

export interface TimeEntryLite {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  startAt: string;
  durationSeconds: number;
}

export interface WorkoutLite {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  date: string;
  durationMinutes?: number;
}

// 寬鬆 schema：本模組僅讀取（never create/update），故不驗證其餘模組自有欄位，
// 只在型別層面標註形狀，供 TypeScript 檢查使用；resource.ts 的 list() 不會執行 zod 驗證。
const timeEntryLiteSchema = z.custom<TimeEntryLite>(() => true);
const workoutLiteSchema = z.custom<WorkoutLite>(() => true);

/** 唯讀：專注模組的時間區段紀錄（time_entries），無 seed，不做寫入。 */
export const timeEntriesReadResource = createResource<TimeEntryLite>({
  name: "time_entries",
  schema: timeEntryLiteSchema,
});

/** 唯讀：運動模組的訓練紀錄（workouts），無 seed，不做寫入。 */
export const workoutsReadResource = createResource<WorkoutLite>({
  name: "workouts",
  schema: workoutLiteSchema,
});
