/**
 * features/rehab/constants.ts — 靜態設定值。
 */

export const BODY_REGION_OPTIONS = [
  { value: "肩關節", label: "肩關節" },
  { value: "膝關節", label: "膝關節" },
  { value: "腰椎", label: "腰椎" },
  { value: "頸椎", label: "頸椎" },
  { value: "髖關節", label: "髖關節" },
  { value: "踝關節", label: "踝關節" },
  { value: "手腕", label: "手腕" },
  { value: "其他", label: "其他" },
];

export const REHAB_TAB_OPTIONS = [
  { value: "today", label: "今日執行" },
  { value: "plans", label: "復健計畫" },
  { value: "timeline", label: "回診時間線" },
  { value: "summary", label: "每週摘要" },
];

export const DISCOMFORT_LABELS: Record<number, string> = {
  0: "完全無不適",
  1: "極輕微",
  2: "輕微",
  3: "輕微偏多",
  4: "中度偏輕",
  5: "中度",
  6: "中度偏重",
  7: "明顯",
  8: "強烈",
  9: "非常強烈",
  10: "無法忍受",
};

export const REHAB_STORAGE_KEY = "dailyos-rehab-ui-v1";
