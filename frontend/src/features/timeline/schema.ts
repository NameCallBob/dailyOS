/**
 * features/timeline/schema.ts — 「健康時間線」模組資料模型。
 *
 * 本模組擁有（完整 CRUD）：
 * - health_documents：健康文件／檢驗報告等附件（附件以 dataURL 儲存，試用模式限制單檔大小）
 * - appointments    ：回診／看診預約
 * - activities      ：日活動量彙總（步數／站立／久坐等），需標示來源，不同來源不得無聲加總
 *
 * 本模組另讀取（唯讀，不透過本模組建立/更新）其他健康模組資料表，用於彙整時間線：
 * symptom_logs（症狀）、workouts（運動）、rehab_sessions（復健）、body_metrics（體重）、
 * sleep_logs（睡眠）、meal_logs（飲食）、medication_logs（用藥）、medications（用藥名稱對照）、
 * notes（備註，僅取含「健康」標籤/資料夾者）。
 *
 * 注意：symptoms／meds／workouts／rehab 等模組尚未由對應 module agent 建置頁面，
 * 本模組為了讓「健康時間線」在試用模式下仍可展示完整情境，會替這些資料表提供 lazy-seed；
 * 欄位命名對齊各模組已預先定義的 schema（symptoms/schema.ts、meds/types.ts），
 * 待對應模組正式建置時可望相容（依 lib/resource.ts 的 lazy-seed 規則，任一方先讀取即定案）。
 */

import { z } from "zod";

import type { BaseRecord } from "@/lib/types";

const baseRecordShape = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
};

// ---------------------------------------------------------------------------
// HealthDocument（本模組擁有）
// ---------------------------------------------------------------------------

export const DOCUMENT_CATEGORY_VALUES = [
  "檢驗報告",
  "影像報告",
  "診斷證明",
  "收據/費用",
  "轉診單",
  "病歷摘要",
  "其他",
] as const;
export const documentCategorySchema = z.enum(DOCUMENT_CATEGORY_VALUES);
export type DocumentCategory = (typeof DOCUMENT_CATEGORY_VALUES)[number];

export interface HealthDocument extends BaseRecord {
  date: string;
  category: DocumentCategory;
  title: string;
  provider?: string;
  fileName?: string;
  mimeType?: string;
  fileDataUrl?: string;
  fileSizeKb?: number;
  appointmentId?: string;
  notes?: string;
}

export const healthDocumentSchema: z.ZodType<HealthDocument> = z.object({
  ...baseRecordShape,
  /** 文件所屬日期 YYYY-MM-DD（檢驗/看診當日，非上傳時間） */
  date: z.string().min(1, "請選擇日期"),
  category: documentCategorySchema,
  title: z.string().min(1, "請輸入文件名稱").max(80, "名稱過長"),
  provider: z.string().max(60, "院所名稱過長").optional(),
  /** 附件檔名（顯示用） */
  fileName: z.string().max(120).optional(),
  mimeType: z.string().max(60).optional(),
  /** 附件內容（data URL），試用模式落地於 IndexedDB；登入模式由後端決定實際儲存策略 */
  fileDataUrl: z.string().optional(),
  fileSizeKb: z.number().min(0).optional(),
  /** 選填：關聯的回診紀錄 id */
  appointmentId: z.string().optional(),
  notes: z.string().max(500, "備註過長").optional(),
});

export type HealthDocumentFormValues = Omit<HealthDocument, "id" | "createdAt" | "updatedAt" | "version" | "deleted">;

// ---------------------------------------------------------------------------
// Appointment（本模組擁有）
// ---------------------------------------------------------------------------

export const APPOINTMENT_STATUS_VALUES = ["scheduled", "completed", "cancelled", "no_show"] as const;
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUS_VALUES);
export type AppointmentStatus = (typeof APPOINTMENT_STATUS_VALUES)[number];

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "已排定",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到診",
};

export interface Appointment extends BaseRecord {
  startAt: string;
  endAt?: string;
  doctor?: string;
  department?: string;
  location: string;
  reason?: string;
  status: AppointmentStatus;
  reminderMinutesBefore?: number;
  followUpNeeded: boolean;
  notes?: string;
}

export const appointmentSchema: z.ZodType<Appointment> = z.object({
  ...baseRecordShape,
  /** 回診時間（ISO） */
  startAt: z.string().min(1, "請選擇回診時間"),
  endAt: z.string().optional(),
  doctor: z.string().max(40, "醫師姓名過長").optional(),
  department: z.string().max(40, "科別過長").optional(),
  location: z.string().min(1, "請輸入地點").max(80, "地點過長"),
  reason: z.string().max(200, "回診原因過長").optional(),
  status: appointmentStatusSchema,
  reminderMinutesBefore: z.number().int().min(0).max(10080).optional(),
  followUpNeeded: z.boolean(),
  notes: z.string().max(500, "備註過長").optional(),
});

export type AppointmentFormValues = Omit<Appointment, "id" | "createdAt" | "updatedAt" | "version" | "deleted">;

// ---------------------------------------------------------------------------
// Activity（本模組擁有）—— 日活動量彙總
// ---------------------------------------------------------------------------

export const ACTIVITY_SOURCE_VALUES = ["manual", "apple_health", "wearable", "import"] as const;
export const activitySourceSchema = z.enum(ACTIVITY_SOURCE_VALUES);
export type ActivitySource = (typeof ACTIVITY_SOURCE_VALUES)[number];

export const ACTIVITY_SOURCE_LABEL: Record<ActivitySource, string> = {
  manual: "手動輸入",
  apple_health: "Apple 健康",
  wearable: "穿戴裝置",
  import: "檔案匯入",
};

export interface Activity extends BaseRecord {
  type: "daily_summary";
  occurredAt: string;
  date: string;
  steps?: number;
  walkTimeMin?: number;
  distanceKm?: number;
  standTimeMin?: number;
  activeMin?: number;
  sedentaryMin?: number;
  source: ActivitySource;
  isPrimary: boolean;
  notes?: string;
}

export const activitySchema: z.ZodType<Activity> = z.object({
  ...baseRecordShape,
  /** 索引欄位（db.ts 已宣告）：固定為 "daily_summary"，保留未來擴充 */
  type: z.literal("daily_summary"),
  /** 索引欄位（db.ts 已宣告）：該筆彙總所代表的時間點（ISO，通常為當日 00:00） */
  occurredAt: z.string().min(1),
  /** 所屬日期 YYYY-MM-DD，衍生自 occurredAt，方便分組/篩選 */
  date: z.string().min(1, "請選擇日期"),
  steps: z.number().min(0).max(200000).optional(),
  walkTimeMin: z.number().min(0).max(1440).optional(),
  distanceKm: z.number().min(0).max(500).optional(),
  standTimeMin: z.number().min(0).max(1440).optional(),
  activeMin: z.number().min(0).max(1440).optional(),
  sedentaryMin: z.number().min(0).max(1440).optional(),
  source: activitySourceSchema,
  /** 使用者標記「此日期採計此筆為主要來源」，供彙總數字顯示使用，避免同日多來源被無聲加總 */
  isPrimary: z.boolean(),
  notes: z.string().max(300).optional(),
});

export type ActivityFormValues = Omit<Activity, "id" | "createdAt" | "updatedAt" | "version" | "deleted">;

// ---------------------------------------------------------------------------
// 讀取用型別／寬鬆 schema（其他模組擁有的資料表；本模組不對其 create/update）
// ---------------------------------------------------------------------------

// symptom_logs（對齊 features/symptoms/schema.ts）
export interface ReadSymptomLog extends BaseRecord {
  symptomDefId: string;
  symptomLabel?: string;
  date: string;
  startAt: string;
  intensity: number;
  bodyLocation?: string;
  durationMin?: number;
  notes?: string;
}
export const readSymptomLogSchema: z.ZodType<ReadSymptomLog> = z.object({
  ...baseRecordShape,
  symptomDefId: z.string(),
  symptomLabel: z.string().optional(),
  date: z.string(),
  startAt: z.string(),
  intensity: z.number(),
  bodyLocation: z.string().optional(),
  durationMin: z.number().optional(),
  notes: z.string().optional(),
});

// workouts（對齊 features/dashboard/resources.ts 讀取子集）
export interface ReadWorkout extends BaseRecord {
  date: string;
  type: string;
  durationMinutes: number;
  caloriesBurned?: number;
  notes?: string;
}
export const readWorkoutSchema: z.ZodType<ReadWorkout> = z.object({
  ...baseRecordShape,
  date: z.string(),
  type: z.string(),
  durationMinutes: z.number(),
  caloriesBurned: z.number().optional(),
  notes: z.string().optional(),
});

// rehab_sessions（尚無其他模組定義，暫依 db.ts 索引欄位設計最小可用形狀）
export interface ReadRehabSession extends BaseRecord {
  rehabPlanId?: string;
  date: string;
  exerciseSummary: string;
  durationMin?: number;
  painLevelBefore?: number;
  painLevelAfter?: number;
  notes?: string;
}
export const readRehabSessionSchema: z.ZodType<ReadRehabSession> = z.object({
  ...baseRecordShape,
  rehabPlanId: z.string().optional(),
  date: z.string(),
  exerciseSummary: z.string(),
  durationMin: z.number().optional(),
  painLevelBefore: z.number().optional(),
  painLevelAfter: z.number().optional(),
  notes: z.string().optional(),
});

// body_metrics（對齊 features/body/schema.ts 讀取子集）
export interface ReadBodyMetric extends BaseRecord {
  date: string;
  weightKg: number;
  note?: string;
}
export const readBodyMetricSchema: z.ZodType<ReadBodyMetric> = z.object({
  ...baseRecordShape,
  date: z.string(),
  weightKg: z.number(),
  note: z.string().optional(),
});

// sleep_logs（對齊 features/sleep/schema.ts 讀取子集）
export interface ReadSleepLog extends BaseRecord {
  date: string;
  hours: number;
  quality: number;
  notes?: string;
}
export const readSleepLogSchema: z.ZodType<ReadSleepLog> = z.object({
  ...baseRecordShape,
  date: z.string(),
  hours: z.number(),
  quality: z.number(),
  notes: z.string().optional(),
});

// meal_logs（對齊 features/nutrition/types.ts 讀取子集）
export interface ReadMealLog extends BaseRecord {
  date: string;
  loggedAt: string;
  type: string;
  text: string;
  calories?: number;
  notes?: string;
}
export const readMealLogSchema: z.ZodType<ReadMealLog> = z.object({
  ...baseRecordShape,
  date: z.string(),
  loggedAt: z.string(),
  type: z.string(),
  text: z.string(),
  calories: z.number().optional(),
  notes: z.string().optional(),
});

// medications（對齊 features/meds/types.ts 讀取子集，僅供名稱對照）
export interface ReadMedication extends BaseRecord {
  name: string;
  unit: string;
}
export const readMedicationSchema: z.ZodType<ReadMedication> = z.object({
  ...baseRecordShape,
  name: z.string(),
  unit: z.string(),
});

// medication_logs（對齊 features/meds/types.ts 讀取子集）
export interface ReadMedicationLog extends BaseRecord {
  medicationId: string;
  scheduledFor: string;
  status: "taken" | "missed" | "skipped";
  takenAt?: string;
  quantity?: number;
  note?: string;
}
export const readMedicationLogSchema: z.ZodType<ReadMedicationLog> = z.object({
  ...baseRecordShape,
  medicationId: z.string(),
  scheduledFor: z.string(),
  status: z.enum(["taken", "missed", "skipped"]),
  takenAt: z.string().optional(),
  quantity: z.number().optional(),
  note: z.string().optional(),
});

// notes（對齊 features/notes/types.ts 讀取子集；僅取 folder/tags 含「健康」者作為「備註」分類）
export interface ReadNote extends BaseRecord {
  title: string;
  content: string;
  folder: string;
  tags: string[];
}
export const readNoteSchema: z.ZodType<ReadNote> = z.object({
  ...baseRecordShape,
  title: z.string(),
  content: z.string(),
  folder: z.string(),
  tags: z.array(z.string()),
});
