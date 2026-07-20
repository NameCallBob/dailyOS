/**
 * features/notes/types.ts — 筆記模組型別與 zod schema。
 *
 * 對應資源：
 * - notes         單篇筆記（Markdown 內容）
 * - note_versions 筆記的版本快照（歷史紀錄 / 衝突分支）
 */

import { z } from "zod";

import type { BaseRecord } from "@/lib/types";

// ---------------------------------------------------------------------------
// Note
// ---------------------------------------------------------------------------

export interface Note extends BaseRecord {
  title: string;
  /** Markdown 原始內容 */
  content: string;
  /** 資料夾路徑，"" 代表未分類；巢狀以 "/" 分隔，例如 "工作/專案 A" */
  folder: string;
  tags: string[];
  /** 收藏（沿用 db.ts 既有索引欄位 pinned） */
  pinned: boolean;
  /** 是否為每日筆記 */
  isDaily: boolean;
  /** 每日筆記對應日期 YYYY-MM-DD（僅 isDaily 為 true 時有值） */
  dailyDate?: string;
  /** 關聯專案（僅供顯示用的軟關聯，不強制對應真實 projects id） */
  projectId?: string;
  projectName?: string;
  /** 關聯任務（同上，軟關聯） */
  taskId?: string;
  taskTitle?: string;
}

export const noteSchema: z.ZodType<Note> = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
  title: z.string().min(1, "請輸入標題").max(200, "標題過長"),
  content: z.string().max(200_000, "內容過長"),
  folder: z.string().max(200),
  tags: z.array(z.string().min(1).max(40)).max(30),
  pinned: z.boolean(),
  isDaily: z.boolean(),
  dailyDate: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
});

/** 筆記編輯表單值（react-hook-form），刻意排除系統欄位 */
export interface NoteFormValues {
  title: string;
  content: string;
  folder: string;
  tagsInput: string; // 逗號分隔的標籤輸入
  pinned: boolean;
  projectName: string;
  taskTitle: string;
}

// ---------------------------------------------------------------------------
// NoteVersion
// ---------------------------------------------------------------------------

export type NoteVersionReason = "manual_save" | "auto_snapshot" | "restore" | "conflict_branch";

export interface NoteVersion extends BaseRecord {
  noteId: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  /** 版本產生原因，供歷史列表標示 */
  reason: NoteVersionReason;
  /** 儲存當下該筆記的 version number，方便對照 */
  noteVersionAtSnapshot: number;
}

export const noteVersionSchema: z.ZodType<NoteVersion> = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
  noteId: z.string(),
  title: z.string(),
  content: z.string(),
  folder: z.string(),
  tags: z.array(z.string()),
  reason: z.enum(["manual_save", "auto_snapshot", "restore", "conflict_branch"]),
  noteVersionAtSnapshot: z.number(),
});

export const NOTE_VERSION_REASON_LABEL: Record<NoteVersionReason, string> = {
  manual_save: "手動儲存",
  auto_snapshot: "自動快照",
  restore: "還原自舊版本",
  conflict_branch: "衝突分支",
};
