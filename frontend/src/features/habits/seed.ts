/**
 * features/habits/seed.ts — 試用模式（Dexie）種子資料。
 * habits：10 筆常見習慣（打勾/計數/數值/時長四種類型都涵蓋）。
 * habit_logs：依各習慣排程，於近 30 天內產生貼近真實的打卡紀錄（含缺漏，避免資料過於「完美」）。
 */

import { newId, nowIso } from "@/lib/resource";
import { addDays, lastNDays, today } from "./date";
import { isScheduledOn } from "./stats";
import type { Habit, HabitLog, HabitSchedule } from "./types";

interface HabitSeedDef {
  id: string;
  name: string;
  icon: string;
  type: Habit["type"];
  unit?: string;
  targetValue: number;
  increment: number;
  schedule: HabitSchedule;
  reminderTime?: string;
  notes?: string;
  createdDaysAgo: number;
  /** 排程日達標機率，用來產生近似真實的打卡紀錄 */
  successRate: number;
}

const HABIT_DEFS: HabitSeedDef[] = [
  {
    id: "habit-water",
    name: "喝水",
    icon: "💧",
    type: "numeric",
    unit: "毫升",
    targetValue: 2000,
    increment: 250,
    schedule: { type: "daily" },
    reminderTime: "09:00",
    notes: "每次 250ml，隨手記錄即可，不用一次喝完。",
    createdDaysAgo: 60,
    successRate: 0.78,
  },
  {
    id: "habit-reading",
    name: "閱讀",
    icon: "📖",
    type: "duration",
    unit: "分鐘",
    targetValue: 30,
    increment: 10,
    schedule: { type: "daily" },
    reminderTime: "21:30",
    notes: "睡前放下手機，讀幾頁書。",
    createdDaysAgo: 52,
    successRate: 0.62,
  },
  {
    id: "habit-exercise",
    name: "運動",
    icon: "🏃",
    type: "duration",
    unit: "分鐘",
    targetValue: 45,
    increment: 15,
    schedule: { type: "weekly-days", days: [1, 3, 5] },
    reminderTime: "18:30",
    notes: "一三五快走或跑步，量力而為。",
    createdDaysAgo: 84,
    successRate: 0.7,
  },
  {
    id: "habit-sleep",
    name: "睡眠時數",
    icon: "😴",
    type: "numeric",
    unit: "小時",
    targetValue: 7,
    increment: 0.5,
    schedule: { type: "daily" },
    notes: "早上起床後回填昨晚的睡眠時數。",
    createdDaysAgo: 45,
    successRate: 0.58,
  },
  {
    id: "habit-meditation",
    name: "靜心冥想",
    icon: "🧘",
    type: "boolean",
    targetValue: 1,
    increment: 1,
    schedule: { type: "daily" },
    reminderTime: "07:30",
    notes: "5 分鐘也算，重點是持續。",
    createdDaysAgo: 38,
    successRate: 0.55,
  },
  {
    id: "habit-early-sleep",
    name: "23:30 前入睡",
    icon: "🌙",
    type: "boolean",
    targetValue: 1,
    increment: 1,
    schedule: { type: "daily" },
    createdDaysAgo: 30,
    successRate: 0.5,
  },
  {
    id: "habit-squats",
    name: "深蹲",
    icon: "🏋️",
    type: "count",
    unit: "下",
    targetValue: 50,
    increment: 10,
    schedule: { type: "every-n-days", n: 2 },
    notes: "分次完成即可，不必一口氣做完。",
    createdDaysAgo: 40,
    successRate: 0.72,
  },
  {
    id: "habit-journal",
    name: "寫日記",
    icon: "📝",
    type: "boolean",
    targetValue: 1,
    increment: 1,
    schedule: { type: "daily" },
    reminderTime: "22:00",
    createdDaysAgo: 70,
    successRate: 0.65,
  },
  {
    id: "habit-vitamins",
    name: "補充維他命",
    icon: "💊",
    type: "boolean",
    targetValue: 1,
    increment: 1,
    schedule: { type: "daily" },
    reminderTime: "08:00",
    createdDaysAgo: 90,
    successRate: 0.83,
  },
  {
    id: "habit-family-time",
    name: "陪伴家人",
    icon: "❤️",
    type: "boolean",
    targetValue: 1,
    increment: 1,
    schedule: { type: "weekly-days", days: [0, 6] },
    notes: "週末留一段完整時間給家人。",
    createdDaysAgo: 55,
    successRate: 0.8,
  },
];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function roundToStep(value: number, step: number): number {
  if (step <= 0) return Math.round(value * 10) / 10;
  return Math.round(value / step) * step;
}

export function seedHabits(): Habit[] {
  const createdBase = nowIso();
  return HABIT_DEFS.map((def, index) => {
    const createdAt = addDays(today(), -def.createdDaysAgo) + createdBase.slice(10);
    return {
      id: def.id,
      createdAt,
      updatedAt: createdAt,
      version: 1,
      deleted: false,
      name: def.name,
      icon: def.icon,
      type: def.type,
      unit: def.unit,
      targetValue: def.targetValue,
      increment: def.increment,
      schedule: def.schedule,
      reminderTime: def.reminderTime,
      archived: false,
      notes: def.notes,
      sortOrder: index,
    } satisfies Habit;
  });
}

export function seedHabitLogs(): HabitLog[] {
  const logs: HabitLog[] = [];
  const todayStr = today();
  const window = lastNDays(30, todayStr);

  for (const def of HABIT_DEFS) {
    const habit: Habit = {
      id: def.id,
      createdAt: today(),
      updatedAt: today(),
      version: 1,
      deleted: false,
      name: def.name,
      icon: def.icon,
      type: def.type,
      unit: def.unit,
      targetValue: def.targetValue,
      increment: def.increment,
      schedule: def.schedule,
      archived: false,
      sortOrder: 0,
    };

    for (const date of window) {
      // 今天先保留 1-2 個習慣「尚未打卡」，呈現真實的當日待辦感。
      if (date === todayStr && (def.id === "habit-reading" || def.id === "habit-sleep")) continue;
      if (!isScheduledOn(habit, date)) continue;

      const roll = Math.random();
      let value = 0;
      if (roll < def.successRate) {
        // 達標，帶一點自然浮動
        if (def.type === "boolean") {
          value = 1;
        } else {
          value = roundToStep(randomBetween(def.targetValue * 0.95, def.targetValue * 1.35), def.increment || 1);
        }
      } else if (roll < def.successRate + 0.25 && def.type !== "boolean") {
        // 有嘗試但未達標
        value = roundToStep(randomBetween(def.targetValue * 0.25, def.targetValue * 0.85), def.increment || 1);
      } else {
        // 完全沒記錄（略過，不寫入 0 值紀錄）
        continue;
      }

      const loggedAt = `${date}T${date === todayStr ? "08:15" : "20:00"}:00.000Z`;
      logs.push({
        id: newId(),
        createdAt: loggedAt,
        updatedAt: loggedAt,
        version: 1,
        deleted: false,
        habitId: def.id,
        date,
        value,
        loggedAt,
      });
    }
  }

  return logs;
}
