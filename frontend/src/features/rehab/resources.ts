/**
 * features/rehab/resources.ts — 本模組的 createResource 綁定。
 *
 * rehab_plans / rehab_exercises / rehab_sessions：完整 CRUD
 *（試用走 Dexie + seed，登入走 /api/v1/{name}/，自訂 action 對應
 * POST /api/v1/{name}/{id}/{action}/）。
 *
 * 重要：本檔案刻意不提供任何「自動調高強度」的 action —— sets/reps/durationSec/
 * loadLimit/angle/frequency 等處方欄位只能透過 rehabExercisesResource.useUpdate()
 * 由使用者在表單中主動送出才會變動。
 */

import { createResource } from "@/lib/resource";

import { rehabExerciseSchema, rehabPlanSchema, rehabSessionSchema, type RehabExercise, type RehabPlan, type RehabSession } from "./schema";
import { seedRehabExercises, seedRehabPlans, seedRehabSessions } from "./seed";

export const rehabPlansResource = createResource<RehabPlan>({
  name: "rehab_plans",
  schema: rehabPlanSchema,
  seed: seedRehabPlans,
  actions: {
    /** 暫停／恢復計畫；不刪除任何處方或歷史紀錄。 */
    toggleActive: {
      httpAction: "toggle-active",
      trial: (record) => ({ active: !record.active }),
    },
  },
});

export const rehabExercisesResource = createResource<RehabExercise>({
  name: "rehab_exercises",
  schema: rehabExerciseSchema,
  seed: seedRehabExercises,
});

export const rehabSessionsResource = createResource<RehabSession>({
  name: "rehab_sessions",
  schema: rehabSessionSchema,
  seed: seedRehabSessions,
  actions: {
    /** 快速勾選「今日完成」，不影響其他實際數值欄位。 */
    toggleDone: {
      httpAction: "toggle-done",
      trial: (record) => ({ done: !record.done }),
    },
  },
});
