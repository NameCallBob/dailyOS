/**
 * features/sleep/schema.ts — 「睡眠」模組資料模型。
 *
 * 對應資源（見 lib/db.ts 已預先宣告的資料表）：
 * - sleep_logs：單次睡眠紀錄（上床時間、入睡時間、起床時間、時數、清醒次數、品質、晨間精神、
 *   睡前活動、備註）。
 *
 * hours 為推導欄位：由 sleepAt 與 wakeAt 計算，寫入時由表單/儲存邏輯計算後一併存入，
 * 方便清單/圖表/統計直接讀取，避免每次都重新解析時間字串；仍保留欄位驗證避免髒資料。
 */

import { z } from "zod";

const baseRecordShape = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
};

// ---------------------------------------------------------------------------
// 列舉
// ---------------------------------------------------------------------------

export const PRE_SLEEP_ACTIVITY_VALUES = [
  "screen",
  "reading",
  "exercise",
  "meal",
  "caffeine",
  "alcohol",
  "meditation",
  "work",
  "none",
  "other",
] as const;

export const preSleepActivitySchema = z.enum(PRE_SLEEP_ACTIVITY_VALUES);
export type PreSleepActivity = z.infer<typeof preSleepActivitySchema>;

export const PRE_SLEEP_ACTIVITY_LABELS: Record<PreSleepActivity, string> = {
  screen: "滑手機／看螢幕",
  reading: "閱讀",
  exercise: "運動",
  meal: "進食／宵夜",
  caffeine: "攝取咖啡因",
  alcohol: "飲酒",
  meditation: "冥想／放鬆",
  work: "工作／讀書",
  none: "無特別活動",
  other: "其他",
};

export const PRE_SLEEP_ACTIVITY_OPTIONS = PRE_SLEEP_ACTIVITY_VALUES.map((value) => ({
  value,
  label: PRE_SLEEP_ACTIVITY_LABELS[value],
}));

// ---------------------------------------------------------------------------
// SleepLog
// ---------------------------------------------------------------------------

export const sleepLogSchema = z
  .object({
    ...baseRecordShape,
    /** 紀錄所屬日期 YYYY-MM-DD：以「起床當天」為準，用於分組／圖表／索引 */
    date: z.string().min(1, "請選擇日期"),
    /** 上床時間（ISO） */
    bedtime: z.string().min(1, "請填寫上床時間"),
    /** 實際入睡時間（ISO），須晚於或等於上床時間 */
    sleepAt: z.string().min(1, "請填寫入睡時間"),
    /** 起床時間（ISO），須晚於入睡時間 */
    wakeAt: z.string().min(1, "請填寫起床時間"),
    /** 推導欄位：(wakeAt - sleepAt) 小時數，寫入時計算 */
    hours: z.number().min(0, "睡眠時數需大於 0").max(24, "睡眠時數超出合理範圍"),
    /** 夜間清醒次數 */
    awakenings: z.number().int().min(0, "次數需為 0 以上").max(20, "數值超出合理範圍").default(0),
    /** 睡眠品質自評 1（很差）～5（很好） */
    quality: z.number().int().min(1, "請選擇睡眠品質").max(5, "請選擇睡眠品質"),
    /** 起床後精神狀態自評 1（很差）～5（很好） */
    morningEnergy: z.number().int().min(1, "請選擇晨間精神").max(5, "請選擇晨間精神"),
    preSleepActivity: preSleepActivitySchema.default("none"),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => new Date(v.sleepAt).getTime() >= new Date(v.bedtime).getTime(), {
    message: "入睡時間不可早於上床時間",
    path: ["sleepAt"],
  })
  .refine((v) => new Date(v.wakeAt).getTime() > new Date(v.sleepAt).getTime(), {
    message: "起床時間需晚於入睡時間",
    path: ["wakeAt"],
  });

export type SleepLog = z.infer<typeof sleepLogSchema>;

export type SleepLogFormValues = Omit<SleepLog, "id" | "createdAt" | "updatedAt" | "version" | "deleted">;
