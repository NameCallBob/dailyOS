/**
 * features/habits/repo.ts — habits / habit_logs 的 createResource 定義。
 * 唯一的資料存取入口；元件一律透過這裡匯出的 repo 存取資料。
 */

import { createResource, type ResourceAction } from "@/lib/resource";
import { seedHabitLogs, seedHabits } from "./seed";
import { habitLogSchema, habitSchema, type Habit, type HabitLog } from "./types";

/**
 * 明確指定第二個泛型參數（actions map）：createResource 的 `A` 預設值為
 * `ActionsMap<T>`（索引簽名），若讓 TS 從物件字面量推論，在部分情況下會退回
 * 預設索引簽名型別，導致 `actions.archive` 被判定為「可能為 undefined」。
 * 顯式標註可避免這個推論陷阱。
 */
type HabitActions = { archive: ResourceAction<Habit> };

export const habitsRepo = createResource<Habit, HabitActions>({
  name: "habits",
  schema: habitSchema,
  seed: seedHabits,
  actions: {
    /** 封存／取消封存：不刪除歷史紀錄，只是從主要清單淡出。 */
    archive: {
      httpAction: "archive",
      trial: (record) => ({ archived: !record.archived }),
    },
  },
});

export const habitLogsRepo = createResource<HabitLog>({
  name: "habit_logs",
  schema: habitLogSchema,
  seed: seedHabitLogs,
});
