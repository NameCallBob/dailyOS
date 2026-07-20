/**
 * features/symptoms/utils.ts — 格式化工具與「保守就醫提醒」判斷。
 *
 * ⚠️ evaluateUrgency() 不是醫療判斷、不做自動診斷：
 * 只依「使用者自填的強度／關鍵字」做極保守的字面比對，命中時一律顯示同一段
 * 「建議諮詢醫療專業人員」提示文字，絕不推測病名、絕不阻擋使用者送出紀錄。
 */

import type { SymptomCategory } from "./schema";

// ---------------------------------------------------------------------------
// 日期／時間格式化
// ---------------------------------------------------------------------------

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDateOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function formatDateShort(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = `${d.getMonth() + 1}/${d.getDate()}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDuration(minutes: number | undefined): string | undefined {
  if (minutes === undefined || Number.isNaN(minutes) || minutes <= 0) return undefined;
  if (minutes < 60) return `${Math.round(minutes)} 分鐘`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest > 0 ? `${hours} 小時 ${rest} 分鐘` : `${hours} 小時`;
}

// ---------------------------------------------------------------------------
// 強度顯示
// ---------------------------------------------------------------------------

export type IntensityTone = "neutral" | "warning" | "danger";

export function intensityTone(intensity: number): IntensityTone {
  if (intensity >= 7) return "danger";
  if (intensity >= 4) return "warning";
  return "neutral";
}

// ---------------------------------------------------------------------------
// 保守就醫提醒（非診斷）
// ---------------------------------------------------------------------------

/** 極保守的字面關鍵字比對；命中僅代表「建議留意」，不代表任何醫療判斷。 */
export const URGENT_KEYWORDS: string[] = [
  "胸痛",
  "胸悶",
  "呼吸困難",
  "喘不過氣",
  "意識不清",
  "昏倒",
  "昏迷",
  "中風",
  "臉歪",
  "嘴歪",
  "肢體無力",
  "單側無力",
  "說話不清",
  "口齒不清",
  "劇烈頭痛",
  "抽搐",
  "痙攣",
  "大量出血",
  "自殺",
  "自傷",
  "過敏性休克",
];

export interface UrgencyInput {
  intensity?: number;
  notes?: string;
  bodyLocation?: string;
  category?: SymptomCategory | string;
  name?: string;
}

export interface UrgencyResult {
  triggered: boolean;
  /** 命中的關鍵字（供除錯／測試用，UI 不需逐一列出，統一顯示同一段保守提示） */
  matchedKeywords: string[];
  /** 是否因強度過高（≥9）觸發（與關鍵字比對相互獨立，理由分開記錄） */
  highIntensity: boolean;
}

/**
 * 保守就醫提醒判斷：僅依「強度是否達到量表高端」與「使用者文字是否包含警示關鍵字」
 * 兩個字面條件，命中任一即回傳 triggered=true。不做任何病因推論。
 */
export function evaluateUrgency(input: UrgencyInput): UrgencyResult {
  const highIntensity = typeof input.intensity === "number" && input.intensity >= 9;
  const haystack = [input.notes, input.bodyLocation, input.name].filter(Boolean).join(" ");
  const matchedKeywords = URGENT_KEYWORDS.filter((keyword) => haystack.includes(keyword));
  return {
    triggered: highIntensity || matchedKeywords.length > 0,
    matchedKeywords,
    highIntensity,
  };
}

export const URGENT_CARE_MESSAGE =
  "此紀錄描述的狀況可能較為嚴重，建議儘快諮詢醫療專業人員，必要時撥打當地緊急電話（台灣：119 / 112）。本工具僅提供個人紀錄，不能取代醫療診斷或建議。";

// ---------------------------------------------------------------------------
// 排序 / 篩選
// ---------------------------------------------------------------------------

export function sortByStartAtDesc<T extends { startAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.startAt < b.startAt ? 1 : a.startAt > b.startAt ? -1 : 0));
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
