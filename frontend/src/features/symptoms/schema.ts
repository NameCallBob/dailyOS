/**
 * features/symptoms/schema.ts — 「症狀」模組資料模型。
 *
 * 對應資源（見 lib/db.ts 已預先宣告的資料表）：
 * - symptom_defs：使用者自訂的症狀定義（例如：偏頭痛、下背痛、焦慮情緒…）
 * - symptom_logs：單次症狀發作紀錄，強度採 0-10 一致量表
 *
 * 重要：本模組不提供任何自動診斷／風險評分邏輯，僅做保守的「建議就醫」提醒
 * （見 utils.ts 的 evaluateUrgency），且一律不阻擋使用者送出紀錄。
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
// SymptomDefinition（症狀定義）
// ---------------------------------------------------------------------------

export const symptomCategorySchema = z.enum([
  "疼痛",
  "痠",
  "麻",
  "腫脹",
  "疲勞",
  "頭痛",
  "情緒",
  "壓力",
  "自訂",
]);
export type SymptomCategory = z.infer<typeof symptomCategorySchema>;

export const symptomDefSchema = z.object({
  ...baseRecordShape,
  name: z.string().min(1, "請輸入症狀名稱").max(30, "名稱過長（上限 30 字）"),
  category: symptomCategorySchema,
  note: z.string().max(200, "說明過長").optional(),
  /** 封存：不再出現於快速紀錄的預設清單，但歷史紀錄仍保留。 */
  archived: z.boolean(),
});

export type SymptomDefinition = z.infer<typeof symptomDefSchema>;
export type SymptomDefFormValues = Omit<
  SymptomDefinition,
  "id" | "createdAt" | "updatedAt" | "version" | "deleted"
>;

// ---------------------------------------------------------------------------
// SymptomLog（症狀發作紀錄）
// ---------------------------------------------------------------------------

export const symptomLogSchema = z.object({
  ...baseRecordShape,
  symptomDefId: z.string().min(1, "請選擇症狀"),
  /** 所屬日期 YYYY-MM-DD（自 startAt 推導，用於分組／篩選，對齊 db.ts 索引） */
  date: z.string().min(1),
  /** 開始時間 ISO 字串 */
  startAt: z.string().min(1, "請選擇開始時間"),
  /** 強度：0（無感）～10（難以忍受），與全站健康模組共用同一量表 */
  intensity: z
    .number({ invalid_type_error: "請選擇強度" })
    .min(0, "強度需介於 0-10")
    .max(10, "強度需介於 0-10"),
  /** 身體部位（見 constants.ts BODY_REGIONS 的 key，或使用者自填文字）；選填，不阻礙快速紀錄 */
  bodyLocation: z.string().max(30).optional(),
  durationMin: z.number().min(0, "時長需為正數").max(10080, "數值超出合理範圍").optional(),
  triggers: z.array(z.string().min(1).max(20)).max(10).optional(),
  relief: z.array(z.string().min(1).max(20)).max(10).optional(),
  notes: z.string().max(500, "備註過長（上限 500 字）").optional(),
  /** 選填照片，儲存為 data URL（試用模式）；登入模式由後端決定實際儲存策略。 */
  photo: z.string().optional(),
});

export type SymptomLog = z.infer<typeof symptomLogSchema>;
export type SymptomLogFormValues = Omit<
  SymptomLog,
  "id" | "createdAt" | "updatedAt" | "version" | "deleted"
>;
