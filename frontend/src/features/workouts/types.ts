/**
 * features/workouts/types.ts — 「健身」模組常數與列舉。
 */

export const WORKOUT_TYPES = [
  "重訓",
  "徒手",
  "步行",
  "跑步",
  "單車",
  "游泳",
  "瑜伽",
  "伸展",
  "復健",
  "自訂",
] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

/** 有氧類：畫面顯示距離／配速／均速／步數欄位。 */
export const CARDIO_TYPES: ReadonlySet<WorkoutType> = new Set(["步行", "跑步", "單車", "游泳"]);
/** 可紀錄動作與組數（重量訓練）的類型。 */
export const SET_TRACKING_TYPES: ReadonlySet<WorkoutType> = new Set(["重訓", "徒手", "復健", "自訂"]);

export const FEELINGS = ["energetic", "good", "normal", "tired", "exhausted"] as const;
export type Feeling = (typeof FEELINGS)[number];

export const FEELING_LABELS: Record<Feeling, string> = {
  energetic: "精神飽滿",
  good: "狀態良好",
  normal: "普通",
  tired: "有點疲累",
  exhausted: "精疲力盡",
};

export const MUSCLE_GROUPS = ["胸部", "背部", "肩部", "手臂", "腿部", "臀部", "核心", "心肺", "全身", "其他"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const SET_SIDES = ["left", "right", "both"] as const;
export type SetSide = (typeof SET_SIDES)[number];
export const SET_SIDE_LABELS: Record<SetSide, string> = { left: "左側", right: "右側", both: "雙側" };

export const WORKOUT_TYPE_OPTIONS = WORKOUT_TYPES.map((value) => ({ value, label: value }));
export const FEELING_OPTIONS = FEELINGS.map((value) => ({ value, label: FEELING_LABELS[value] }));
export const MUSCLE_GROUP_OPTIONS = MUSCLE_GROUPS.map((value) => ({ value, label: value }));
export const SET_SIDE_OPTIONS = SET_SIDES.map((value) => ({ value, label: SET_SIDE_LABELS[value] }));
