/**
 * features/symptoms/constants.ts — 靜態設定值（分類、人體區域、強度量表、常用標籤）。
 */

import type { SymptomCategory } from "./schema";

export interface CategoryOption {
  value: SymptomCategory;
  label: string;
}

export const SYMPTOM_CATEGORIES: CategoryOption[] = [
  { value: "疼痛", label: "疼痛" },
  { value: "痠", label: "痠" },
  { value: "麻", label: "麻" },
  { value: "腫脹", label: "腫脹" },
  { value: "疲勞", label: "疲勞" },
  { value: "頭痛", label: "頭痛" },
  { value: "情緒", label: "情緒" },
  { value: "壓力", label: "壓力" },
  { value: "自訂", label: "自訂" },
];

// ---------------------------------------------------------------------------
// 強度量表（0-10，全站健康模組一致）
// ---------------------------------------------------------------------------

export const INTENSITY_MIN = 0;
export const INTENSITY_MAX = 10;

export const INTENSITY_ANCHOR_LABELS: Record<number, string> = {
  0: "無感",
  3: "輕微",
  6: "中等",
  8: "嚴重",
  10: "難以忍受",
};

// ---------------------------------------------------------------------------
// 人體區域（提供選擇，但預設收合，不阻礙快速紀錄）
// ---------------------------------------------------------------------------

export type BodyRegionKey =
  | "head"
  | "neck"
  | "shoulder_l"
  | "shoulder_r"
  | "chest"
  | "upper_back"
  | "arm_l"
  | "arm_r"
  | "abdomen"
  | "elbow_l"
  | "elbow_r"
  | "lower_back"
  | "forearm_l"
  | "forearm_r"
  | "hip"
  | "wrist_hand_l"
  | "wrist_hand_r"
  | "thigh_l"
  | "thigh_r"
  | "knee_l"
  | "knee_r"
  | "calf_l"
  | "calf_r"
  | "ankle_foot_l"
  | "ankle_foot_r"
  | "whole_body"
  | "other";

export const BODY_REGION_LABELS: Record<BodyRegionKey, string> = {
  head: "頭部",
  neck: "頸部",
  shoulder_l: "左肩",
  shoulder_r: "右肩",
  chest: "胸部",
  upper_back: "上背",
  arm_l: "左上臂",
  arm_r: "右上臂",
  abdomen: "腹部",
  elbow_l: "左手肘",
  elbow_r: "右手肘",
  lower_back: "下背",
  forearm_l: "左前臂",
  forearm_r: "右前臂",
  hip: "髖部/骨盆",
  wrist_hand_l: "左手腕/手",
  wrist_hand_r: "右手腕/手",
  thigh_l: "左大腿",
  thigh_r: "右大腿",
  knee_l: "左膝",
  knee_r: "右膝",
  calf_l: "左小腿",
  calf_r: "右小腿",
  ankle_foot_l: "左腳踝/腳",
  ankle_foot_r: "右腳踝/腳",
  whole_body: "全身",
  other: "其他",
};

/** 由上而下、由左而右排列，粗略呈現人體輪廓（非精確醫學圖）。null 表示留空。 */
export const BODY_MAP_LAYOUT: Array<[BodyRegionKey | null, BodyRegionKey | null, BodyRegionKey | null]> = [
  [null, "head", null],
  [null, "neck", null],
  ["shoulder_l", "chest", "shoulder_r"],
  ["arm_l", "upper_back", "arm_r"],
  ["elbow_l", "abdomen", "elbow_r"],
  ["forearm_l", "lower_back", "forearm_r"],
  ["wrist_hand_l", "hip", "wrist_hand_r"],
  ["thigh_l", null, "thigh_r"],
  ["knee_l", null, "knee_r"],
  ["calf_l", null, "calf_r"],
  ["ankle_foot_l", null, "ankle_foot_r"],
  ["whole_body", null, "other"],
];

// ---------------------------------------------------------------------------
// 常用誘因／緩解方式（快速標籤，仍可自行輸入其他文字）
// ---------------------------------------------------------------------------

export const TRIGGER_PRESETS = [
  "睡眠不足",
  "壓力",
  "天氣變化",
  "姿勢不良",
  "運動後",
  "飲食",
  "經期",
  "久坐/久站",
  "長時間用 3C",
  "不明原因",
];

export const RELIEF_PRESETS = [
  "休息",
  "伸展",
  "冰敷",
  "熱敷",
  "按摩",
  "藥物",
  "深呼吸/放鬆",
  "調整姿勢",
  "就醫治療",
  "無緩解",
];

export const SYMPTOM_STORAGE_KEY = "dailyos-symptoms-ui-v1";
