/**
 * features/nutrition/resource.ts — meal_logs 資源存取（唯一入口）。
 */

import { createResource } from "@/lib/resource";

import { mealLogSchema, type MealLog } from "./types";
import { seedMealLogs } from "./seed";

export const mealLogsResource = createResource<MealLog>({
  name: "meal_logs",
  schema: mealLogSchema,
  seed: seedMealLogs,
});
