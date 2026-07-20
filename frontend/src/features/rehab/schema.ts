/**
 * features/rehab/schema.ts — 「復健」模組資料模型。
 *
 * 對應資源（見 lib/db.ts 已預先宣告的資料表）：
 * - rehab_plans     ：復健計畫（通常由治療師開立，可包含多個復健項目）
 * - rehab_exercises ：計畫底下的個別復健項目（動作、劑量、注意事項）
 * - rehab_sessions  ：某項目在某天的實際執行紀錄
 *
 * 核心原則（務必遵守）：系統不得自行增加復健強度或建議加量；
 * 本檔案內不提供任何「自動調整」邏輯 —— sets/reps/durationSec/loadLimit 等處方值
 * 只能由使用者透過表單主動編輯（呼叫 rehab_exercises 的 update）才會變動。
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// 共用 BaseRecord 欄位
// ---------------------------------------------------------------------------

const baseRecordShape = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
};

// ---------------------------------------------------------------------------
// RehabPlan（復健計畫）
// ---------------------------------------------------------------------------

/** 回診時間線上的一筆事件：回診紀錄或處方調整說明，一律由使用者主動新增。 */
export const rehabReviewEntrySchema = z.object({
  id: z.string(),
  date: z.string().min(1, "請選擇日期"),
  note: z.string().min(1, "請輸入回診內容"),
  /** 是否伴隨處方調整（僅供標記顯示，實際調整仍須使用者另行編輯項目） */
  adjustment: z.boolean().optional(),
});
export type RehabReviewEntry = z.infer<typeof rehabReviewEntrySchema>;

export const rehabPlanSchema = z.object({
  ...baseRecordShape,
  name: z.string().min(1, "請輸入計畫名稱").max(60, "名稱過長"),
  bodyRegion: z.string().max(30).optional(),
  diagnosis: z.string().max(120, "內容過長").optional(),
  goal: z.string().max(200, "內容過長").optional(),
  therapistName: z.string().max(30).optional(),
  clinicName: z.string().max(40).optional(),
  /** 計畫是否仍在執行中；使用者可手動暫停/恢復，系統不會自動結案。 */
  active: z.boolean(),
  startDate: z.string().min(1, "請選擇開始日期"),
  /** 下次回診時間（YYYY-MM-DD），選填 */
  nextAppointmentAt: z.string().optional(),
  /** 一般性注意事項（例如：疼痛超過 3 分請立即停止並回診） */
  generalCautions: z.string().max(300).optional(),
  /** 回診時間線：使用者主動新增的回診 / 調整紀錄，依日期顯示 */
  reviewNotes: z.array(rehabReviewEntrySchema).default([]),
  note: z.string().max(500).optional(),
});

export type RehabPlan = z.infer<typeof rehabPlanSchema>;
export type RehabPlanFormValues = Omit<RehabPlan, "id" | "createdAt" | "updatedAt" | "version" | "deleted" | "reviewNotes">;

// ---------------------------------------------------------------------------
// RehabExercise（復健項目 / 處方）
// ---------------------------------------------------------------------------

export const rehabExerciseSchema = z.object({
  ...baseRecordShape,
  rehabPlanId: z.string().min(1),
  name: z.string().min(1, "請輸入項目名稱").max(60, "名稱過長"),
  instructions: z.string().max(600, "內容過長").optional(),
  /** 教學圖片／影片連結（選填） */
  media: z.string().max(300).optional(),
  sets: z.number({ invalid_type_error: "請輸入組數" }).int().min(0).max(50).optional(),
  reps: z.number({ invalid_type_error: "請輸入次數" }).int().min(0).max(500).optional(),
  durationSec: z.number().int().min(0).max(7200).optional(),
  /** 負重上限（自由文字，例如「≤5 kg」「彈力帶黃色以下」），由治療師開立、使用者不可自行調高 */
  loadLimit: z.string().max(40).optional(),
  /** 關節活動角度限制（例如「膝屈曲 0–90°」） */
  angle: z.string().max(40).optional(),
  cautions: z.string().max(300).optional(),
  /** 執行頻率（自由文字，例如「每天 2 次，共 7 天 / 週」） */
  frequency: z.string().max(60).optional(),
  therapistNote: z.string().max(300).optional(),
  effectiveDate: z.string().min(1, "請選擇生效日期"),
  /** 停止日期：留空代表持續執行中 */
  stopDate: z.string().optional(),
  /** 排序（清單顯示順序） */
  order: z.number().int().optional(),
});

export type RehabExercise = z.infer<typeof rehabExerciseSchema>;
export type RehabExerciseFormValues = Omit<RehabExercise, "id" | "createdAt" | "updatedAt" | "version" | "deleted" | "rehabPlanId">;

// ---------------------------------------------------------------------------
// RehabSession（單一項目、單一日期的執行紀錄）
// ---------------------------------------------------------------------------

export const rehabSessionSchema = z.object({
  ...baseRecordShape,
  rehabPlanId: z.string().min(1),
  rehabExerciseId: z.string().min(1),
  date: z.string().min(1, "請選擇日期"),
  done: z.boolean(),
  actualSets: z.number().int().min(0).max(50).optional(),
  actualReps: z.number().int().min(0).max(500).optional(),
  /** 實際執行時間（秒） */
  actualTime: z.number().int().min(0).max(7200).optional(),
  discomfortBefore: z.number().int().min(0, "範圍為 0–10").max(10, "範圍為 0–10").optional(),
  discomfortAfter: z.number().int().min(0, "範圍為 0–10").max(10, "範圍為 0–10").optional(),
  /** 實際使用的負重／阻力（自由文字，例如「3kg」「彈力帶紅色」） */
  load: z.string().max(40).optional(),
  notes: z.string().max(300).optional(),
});

export type RehabSession = z.infer<typeof rehabSessionSchema>;
export type RehabSessionFormValues = Omit<
  RehabSession,
  "id" | "createdAt" | "updatedAt" | "version" | "deleted" | "rehabPlanId" | "rehabExerciseId" | "date"
>;
