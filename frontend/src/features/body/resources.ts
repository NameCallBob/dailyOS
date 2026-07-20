/**
 * features/body/resources.ts — 本模組的 createResource 綁定。
 *
 * body_metrics / water_logs：完整 CRUD（試用走 Dexie + seed，登入走 /api/v1/{name}/）。
 * user_profile：唯讀用途（僅取身高計算 BMI），不在此模組建立/更新，故不提供 seed
 *（避免與設定模組的種子資料互相覆蓋；若尚未有資料，畫面會顯示「尚未設定身高」提示）。
 */

import { createResource } from "@/lib/resource";

import { bodyMetricSchema, userProfileLiteSchema, waterLogSchema, type BodyMetric, type UserProfileLite, type WaterLog } from "./schema";
import { seedBodyMetrics, seedWaterLogs } from "./seed";

export const bodyMetricsResource = createResource<BodyMetric>({
  name: "body_metrics",
  schema: bodyMetricSchema,
  seed: seedBodyMetrics,
});

export const waterLogsResource = createResource<WaterLog>({
  name: "water_logs",
  schema: waterLogSchema,
  seed: seedWaterLogs,
});

export const userProfileResource = createResource<UserProfileLite>({
  name: "user_profile",
  schema: userProfileLiteSchema,
});
