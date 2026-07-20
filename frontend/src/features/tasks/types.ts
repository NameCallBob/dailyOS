/**
 * features/tasks/types.ts — 任務模組型別定義。
 * 對應資料表：tasks, projects, tags（皆已於 lib/db.ts 宣告）。
 */

import type { BaseRecord } from "@/lib/types";

export const TASK_STATUSES = [
  "inbox",
  "planned",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
  "archived",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "med", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_ENERGIES = ["low", "med", "high"] as const;
export type TaskEnergy = (typeof TASK_ENERGIES)[number];

export const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Milestone {
  id: string;
  title: string;
  dueDate: string | null;
  done: boolean;
}

export interface Task extends BaseRecord {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  tags: string[];
  dueDate: string | null;
  scheduledAt: string | null;
  estimateMin: number | null;
  actualMin: number | null;
  energy: TaskEnergy | null;
  context: string | null;
  recurrenceRule: string | null;
  parentId: string | null;
  dependsOn: string[];
  remindAt: string | null;
  completedAt: string | null;
  archived: boolean;
}

export interface Project extends BaseRecord {
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  startDate: string | null;
  targetDate: string | null;
  /** 儲存值僅為快取，畫面一律以 computeProjectProgress() 依任務即時推導顯示。 */
  progress: number;
  milestones: Milestone[];
}

export interface Tag extends BaseRecord {
  name: string;
  color: string;
}

/** 清單檢視分頁 */
export const TASK_VIEWS = ["today", "upcoming", "inbox", "all", "completed"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const TASK_LAYOUTS = ["list", "board"] as const;
export type TaskLayout = (typeof TASK_LAYOUTS)[number];
