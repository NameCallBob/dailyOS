/**
 * features/workouts/schema.ts — 「健身」模組資料模型。
 *
 * 對應資源（見 lib/db.ts 已預先宣告的資料表）：
 * - workouts           ：單次訓練紀錄（重訓 / 有氧 / 瑜伽 / 復健…），含有氧專屬欄位
 * - workout_exercises  ：訓練中使用的動作（連結 workouts 與 exercise_defs）
 * - workout_sets       ：每個動作的組數紀錄（reps / weight / rest / rpe / 側邊 / PR…）
 * - exercise_defs      ：動作庫（內建 + 使用者自訂）
 *
 * 「運動範本」不另建資料表：以 workouts.isTemplate=true 標記，範本本身的
 * workout_exercises / workout_sets 照常掛在該筆 workoutId 下；套用範本／套用上次
 * 時於前端複製整組紀錄為新的一般訓練（見 utils.ts 的 buildDuplicatePlan）。
 */

import { z } from "zod";

import { FEELINGS, MUSCLE_GROUPS, SET_SIDES, WORKOUT_TYPES } from "./types";

const baseRecordShape = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),
};

export const workoutTypeSchema = z.enum(WORKOUT_TYPES);
export const feelingSchema = z.enum(FEELINGS);
export const muscleGroupSchema = z.enum(MUSCLE_GROUPS);
export const setSideSchema = z.enum(SET_SIDES);

// ---------------------------------------------------------------------------
// Workout
// ---------------------------------------------------------------------------

export const workoutSchema = z.object({
  ...baseRecordShape,
  /** 訓練日期 YYYY-MM-DD（用於分組／統計） */
  date: z.string().min(1, "請選擇日期"),
  /** 開始時間 ISO 字串 */
  startAt: z.string().min(1, "請輸入開始時間"),
  /** 結束時間 ISO 字串（選填，可由時長回推） */
  endAt: z.string().optional(),
  type: workoutTypeSchema,
  /** 本次訓練目標，例如「胸推 3x8 突破 PR」 */
  goal: z.string().max(200).optional(),
  durationMin: z
    .number({ invalid_type_error: "請輸入時長" })
    .min(1, "時長需大於 0")
    .max(1000, "數值超出合理範圍"),
  rpe: z.number().min(1).max(10).optional(),
  avgHr: z.number().min(0).max(260).optional(),
  calories: z.number().min(0).max(6000).optional(),
  notes: z.string().max(1000).optional(),
  feeling: feelingSchema,
  // 有氧專屬（步行／跑步／單車／游泳）
  distanceKm: z.number().min(0).max(500).optional(),
  paceMinPerKm: z.number().min(0).max(60).optional(),
  avgSpeedKmh: z.number().min(0).max(120).optional(),
  steps: z.number().min(0).max(200000).optional(),
  // 範本
  isTemplate: z.boolean().default(false),
  templateName: z.string().max(60).optional(),
});

export type Workout = z.infer<typeof workoutSchema>;
export type WorkoutFormValues = Omit<Workout, "id" | "createdAt" | "updatedAt" | "version" | "deleted">;

// ---------------------------------------------------------------------------
// ExerciseDef（動作庫）
// ---------------------------------------------------------------------------

export const exerciseDefSchema = z.object({
  ...baseRecordShape,
  name: z.string().min(1, "請輸入動作名稱").max(60, "名稱過長"),
  category: muscleGroupSchema,
  equipment: z.string().max(60).optional(),
  isCustom: z.boolean().default(true),
  notes: z.string().max(300).optional(),
});

export type ExerciseDef = z.infer<typeof exerciseDefSchema>;
export type ExerciseDefFormValues = Omit<ExerciseDef, "id" | "createdAt" | "updatedAt" | "version" | "deleted">;

// ---------------------------------------------------------------------------
// WorkoutExercise（訓練 x 動作）
// ---------------------------------------------------------------------------

export const workoutExerciseSchema = z.object({
  ...baseRecordShape,
  workoutId: z.string().min(1),
  exerciseDefId: z.string().min(1),
  order: z.number().int().min(0),
  notes: z.string().max(300).optional(),
});

export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

// ---------------------------------------------------------------------------
// WorkoutSet（組數）
// ---------------------------------------------------------------------------

export const workoutSetSchema = z.object({
  ...baseRecordShape,
  workoutExerciseId: z.string().min(1),
  order: z.number().int().min(0),
  reps: z.number().int().min(0).max(1000).optional(),
  weightKg: z.number().min(0).max(500).optional(),
  restSec: z.number().int().min(0).max(1800).optional(),
  rpe: z.number().min(1).max(10).optional(),
  rir: z.number().min(0).max(10).optional(),
  side: setSideSchema.optional(),
  isWarmup: z.boolean().default(false),
  isWorking: z.boolean().default(true),
  isPr: z.boolean().default(false),
});

export type WorkoutSet = z.infer<typeof workoutSetSchema>;
export type WorkoutSetFormValues = Omit<WorkoutSet, "id" | "createdAt" | "updatedAt" | "version" | "deleted" | "workoutExerciseId" | "order">;
