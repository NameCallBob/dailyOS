/**
 * features/habits/format.ts — 顯示用格式化工具。
 */

import type { Habit } from "./types";

/** 去除多餘小數點（例如 7.0 -> 7、7.5 保留）。 */
export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatValueWithUnit(habit: Habit, value: number): string {
  if (habit.type === "boolean") return value >= 1 ? "已完成" : "尚未完成";
  const unit = habit.unit ?? "";
  return `${formatNumber(value)}${unit}`;
}

export function formatTarget(habit: Habit): string {
  if (habit.type === "boolean") return "每次完成即達標";
  const unit = habit.unit ?? "";
  return `目標 ${formatNumber(habit.targetValue)}${unit}`;
}

export function formatScheduleSummary(habit: Habit): string {
  const { schedule } = habit;
  switch (schedule.type) {
    case "daily":
      return "每天";
    case "weekly-days": {
      const labels = ["日", "一", "二", "三", "四", "五", "六"];
      const days = (schedule.days ?? []).slice().sort((a, b) => a - b);
      if (days.length === 0) return "每週（尚未選擇日子）";
      return `每週 ${days.map((d) => `週${labels[d]}`).join("、")}`;
    }
    case "monthly":
      return `每月 ${schedule.dayOfMonth ?? 1} 號`;
    case "every-n-days":
      return `每隔 ${schedule.n ?? 2} 天`;
    default:
      return "";
  }
}
