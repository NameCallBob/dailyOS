/**
 * features/tasks/schema.ts — zod schema：資料層驗證（供 resource.ts 試用模式使用）
 * 與表單層驗證（供 react-hook-form 使用）。
 */

import { z } from "zod";

import { TASK_ENERGIES, TASK_PRIORITIES, TASK_STATUSES, PROJECT_STATUSES } from "./types";

const baseRecordShape = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
};

export const milestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "請輸入里程碑名稱"),
  dueDate: z.string().nullable(),
  done: z.boolean(),
});

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const taskSchema = z.object({
  ...baseRecordShape,
  title: z.string().min(1, "請輸入任務標題").max(200, "標題過長"),
  description: z.string().nullable().default(null),
  status: z.enum(TASK_STATUSES).default("inbox"),
  priority: z.enum(TASK_PRIORITIES).default("med"),
  projectId: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  dueDate: z.string().nullable().default(null),
  scheduledAt: z.string().nullable().default(null),
  estimateMin: z.number().int().nonnegative().nullable().default(null),
  actualMin: z.number().int().nonnegative().nullable().default(null),
  energy: z.enum(TASK_ENERGIES).nullable().default(null),
  context: z.string().nullable().default(null),
  recurrenceRule: z.string().nullable().default(null),
  parentId: z.string().nullable().default(null),
  dependsOn: z.array(z.string()).default([]),
  remindAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  archived: z.boolean().default(false),
});

/** 建立/編輯表單用（react-hook-form），欄位為使用者可輸入的子集，型別較寬鬆以利表單狀態管理。 */
export const taskFormSchema = z.object({
  title: z.string().min(1, "請輸入任務標題").max(200, "標題過長"),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  projectId: z.string().optional(),
  tagsInput: z.string().optional(),
  dueDate: z.string().optional(),
  scheduledAt: z.string().optional(),
  estimateMin: z.string().optional(),
  energy: z.union([z.enum(TASK_ENERGIES), z.literal("")]).optional(),
  context: z.string().optional(),
  recurrenceRule: z.string().optional(),
  parentId: z.string().optional(),
  dependsOnInput: z.array(z.string()).optional(),
  remindAt: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const projectSchema = z.object({
  ...baseRecordShape,
  name: z.string().min(1, "請輸入專案名稱").max(120, "名稱過長"),
  description: z.string().nullable().default(null),
  status: z.enum(PROJECT_STATUSES).default("planning"),
  color: z.string().default("#8a6a52"),
  startDate: z.string().nullable().default(null),
  targetDate: z.string().nullable().default(null),
  progress: z.number().min(0).max(100).default(0),
  milestones: z.array(milestoneSchema).default([]),
});

export const projectFormSchema = z.object({
  name: z.string().min(1, "請輸入專案名稱").max(120, "名稱過長"),
  description: z.string().optional(),
  status: z.enum(PROJECT_STATUSES),
  color: z.string().min(1, "請選擇顏色"),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

export const tagSchema = z.object({
  ...baseRecordShape,
  name: z.string().min(1, "請輸入標籤名稱").max(40, "名稱過長"),
  color: z.string().default("#6b6b6b"),
});

export const tagFormSchema = z.object({
  name: z.string().min(1, "請輸入標籤名稱").max(40, "名稱過長"),
  color: z.string().min(1),
});

export type TagFormValues = z.infer<typeof tagFormSchema>;
