/**
 * features/tasks/constants.ts — 任務模組共用常數（狀態/優先權/精力 標籤與樣式）。
 */

import type { BadgeTone } from "@/components/ui/badge";

import type { ProjectStatus, TaskEnergy, TaskPriority, TaskStatus, TaskView } from "./types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox: "收件匣",
  planned: "已規劃",
  in_progress: "進行中",
  blocked: "已阻擋",
  completed: "已完成",
  cancelled: "已取消",
  archived: "已封存",
};

export const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  inbox: "neutral",
  planned: "accent",
  in_progress: "accent",
  blocked: "warning",
  completed: "success",
  cancelled: "neutral",
  archived: "neutral",
};

/** Board 檢視顯示的欄位（不含 archived，封存任務於 All/篩選中另外檢視）。 */
export const BOARD_COLUMNS: TaskStatus[] = [
  "inbox",
  "planned",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
];

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "低",
  med: "中",
  high: "高",
  urgent: "緊急",
};

export const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = {
  low: "neutral",
  med: "accent",
  high: "warning",
  urgent: "danger",
};

export const ENERGY_LABEL: Record<TaskEnergy, string> = {
  low: "低耗能",
  med: "中耗能",
  high: "高耗能",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "規劃中",
  active: "進行中",
  on_hold: "暫停",
  completed: "已完成",
  archived: "已封存",
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  planning: "neutral",
  active: "accent",
  on_hold: "warning",
  completed: "success",
  archived: "neutral",
};

export const TASK_VIEW_LABEL: Record<TaskView, string> = {
  today: "今天",
  upcoming: "即將到來",
  inbox: "收件匣",
  all: "全部",
  completed: "已完成",
};
