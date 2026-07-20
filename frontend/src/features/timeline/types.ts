/**
 * features/timeline/types.ts — 時間線統一項目型別與篩選狀態。
 */

import type { BadgeTone } from "@/components/ui/badge";

export const TIMELINE_KINDS = [
  "symptom",
  "exercise",
  "rehab",
  "weight",
  "sleep",
  "diet",
  "medication",
  "appointment",
  "document",
  "note",
] as const;

export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export const TIMELINE_KIND_LABEL: Record<TimelineKind, string> = {
  symptom: "症狀",
  exercise: "運動",
  rehab: "復健",
  weight: "體重",
  sleep: "睡眠",
  diet: "飲食",
  medication: "用藥",
  appointment: "回診",
  document: "文件",
  note: "備註",
};

export const TIMELINE_KIND_TONE: Record<TimelineKind, BadgeTone> = {
  symptom: "danger",
  exercise: "success",
  rehab: "accent",
  weight: "neutral",
  sleep: "neutral",
  diet: "warning",
  medication: "accent",
  appointment: "warning",
  document: "neutral",
  note: "neutral",
};

/** 統一後的時間線項目，來源可能是本模組擁有的資料表，也可能是唯讀彙整的其他健康資料表 */
export interface TimelineEntry {
  /** `${kind}:${原始 id}`，確保跨來源不重複 */
  id: string;
  kind: TimelineKind;
  /** 所屬日期 YYYY-MM-DD，用於分組/篩選 */
  date: string;
  /** 實際發生時間 ISO，用於排序 */
  at: string;
  title: string;
  subtitle?: string;
  /** 小標籤（例如強度、數值），非顏色單獨表意，皆搭配文字 */
  meta: string[];
  notes?: string;
  /** 僅本模組擁有的三種資料（health_documents / appointments / activities）可編輯 */
  editable: boolean;
  /** 原始記錄 id（未加前綴），供編輯/刪除操作使用 */
  recordId: string;
  /** 額外詳細資訊，供展開列顯示（例如活動來源、文件檔名） */
  detail?: string;
}

export interface TimelineFilters {
  kinds: TimelineKind[];
  search: string;
  dateStart?: string;
  dateEnd?: string;
}

export const DEFAULT_FILTERS: TimelineFilters = {
  kinds: [...TIMELINE_KINDS],
  search: "",
};
