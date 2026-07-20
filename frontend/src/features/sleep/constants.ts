/**
 * features/sleep/constants.ts — 靜態設定值（品質/精神量表標籤、統計視窗天數）。
 */

export const QUALITY_LABELS: Record<number, string> = {
  1: "很差",
  2: "不佳",
  3: "普通",
  4: "良好",
  5: "很好",
};

export const ENERGY_LABELS: Record<number, string> = {
  1: "很疲憊",
  2: "有點累",
  3: "普通",
  4: "還不錯",
  5: "精神飽滿",
};

export const QUALITY_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({
  value: String(value),
  label: `${value} · ${QUALITY_LABELS[value]}`,
}));

export const ENERGY_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({
  value: String(value),
  label: `${value} · ${ENERGY_LABELS[value]}`,
}));

/** 每週平均／作息規律度計算的預設視窗（天） */
export const WEEK_WINDOW_DAYS = 7;
export const REGULARITY_WINDOW_DAYS = 14;
export const CORRELATION_WINDOW_DAYS = 30;

/** 建議睡眠時數範圍（成人一般建議），僅供畫面提示參考，非醫療判斷 */
export const RECOMMENDED_HOURS_MIN = 7;
export const RECOMMENDED_HOURS_MAX = 9;
