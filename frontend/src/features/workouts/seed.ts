/**
 * features/workouts/seed.ts — 試用模式種子資料。
 *
 * 四張表彼此以外鍵關聯（workouts <- workout_exercises <- workout_sets，
 * exercise_defs <- workout_exercises），因此以單一 `buildSeedGraph()` 產生
 * 一致的 id 並快取，四個 `seed*()` 函式各自回傳對應切片，
 * 不論 resource.ts 對哪張表先觸發 lazy-seed，id 都能正確對應。
 */

import { newId, nowIso } from "@/lib/resource";
import type { ExerciseDef, Workout, WorkoutExercise, WorkoutSet } from "./schema";
import { combineDateTime, isoDateDaysAgo } from "./utils";

interface SeedGraph {
  exerciseDefs: ExerciseDef[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  workoutSets: WorkoutSet[];
}

let cache: SeedGraph | null = null;

function makeExerciseDefs(now: string): ExerciseDef[] {
  const defs: Array<Omit<ExerciseDef, "id" | "createdAt" | "updatedAt" | "version" | "deleted">> = [
    { name: "槓鈴臥推", category: "胸部", equipment: "槓鈴", isCustom: false },
    { name: "上斜啞鈴臥推", category: "胸部", equipment: "啞鈴", isCustom: false },
    { name: "伏地挺身", category: "胸部", equipment: "徒手", isCustom: false },
    { name: "槓鈴深蹲", category: "腿部", equipment: "槓鈴", isCustom: false },
    { name: "保加利亞分腿蹲", category: "腿部", equipment: "啞鈴", isCustom: false },
    { name: "羅馬尼亞硬舉", category: "腿部", equipment: "槓鈴", isCustom: false },
    { name: "硬舉", category: "背部", equipment: "槓鈴", isCustom: false },
    { name: "引體向上", category: "背部", equipment: "單槓", isCustom: false },
    { name: "槓鈴划船", category: "背部", equipment: "槓鈴", isCustom: false },
    { name: "滑輪下拉", category: "背部", equipment: "滑輪機", isCustom: false },
    { name: "啞鈴肩推", category: "肩部", equipment: "啞鈴", isCustom: false },
    { name: "側平舉", category: "肩部", equipment: "啞鈴", isCustom: false },
    { name: "二頭彎舉", category: "手臂", equipment: "啞鈴", isCustom: false },
    { name: "三頭下壓", category: "手臂", equipment: "滑輪機", isCustom: false },
    { name: "棒式", category: "核心", equipment: "徒手", isCustom: false },
    { name: "捲腹", category: "核心", equipment: "徒手", isCustom: false },
    { name: "農夫走路", category: "全身", equipment: "壺鈴", isCustom: true, notes: "自訂：握力與核心穩定訓練" },
  ];
  return defs.map((d) => ({
    ...d,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    version: 1,
    deleted: false,
  }));
}

function findDefId(defs: ExerciseDef[], name: string): string {
  const found = defs.find((d) => d.name === name);
  if (!found) throw new Error(`seed: exercise def not found: ${name}`);
  return found.id;
}

interface SetPlan {
  reps: number;
  weightKg?: number;
  restSec?: number;
  rpe?: number;
  rir?: number;
  isWarmup?: boolean;
  side?: "left" | "right" | "both";
  isPr?: boolean;
}

interface ExercisePlan {
  exerciseName: string;
  notes?: string;
  sets: SetPlan[];
}

interface WorkoutPlan {
  daysAgo: number;
  type: Workout["type"];
  startHour: number;
  startMinute: number;
  durationMin: number;
  goal?: string;
  rpe?: number;
  avgHr?: number;
  calories?: number;
  notes?: string;
  feeling: Workout["feeling"];
  distanceKm?: number;
  paceMinPerKm?: number;
  avgSpeedKmh?: number;
  steps?: number;
  isTemplate?: boolean;
  templateName?: string;
  exercises?: ExercisePlan[];
}

function buildStrengthGraph(
  defs: ExerciseDef[],
  now: string,
  workoutId: string,
  plans: ExercisePlan[],
): { exercises: WorkoutExercise[]; sets: WorkoutSet[] } {
  const exercises: WorkoutExercise[] = [];
  const sets: WorkoutSet[] = [];

  plans.forEach((plan, exIndex) => {
    const we: WorkoutExercise = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      workoutId,
      exerciseDefId: findDefId(defs, plan.exerciseName),
      order: exIndex,
      notes: plan.notes,
    };
    exercises.push(we);

    plan.sets.forEach((s, setIndex) => {
      sets.push({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        version: 1,
        deleted: false,
        workoutExerciseId: we.id,
        order: setIndex,
        reps: s.reps,
        weightKg: s.weightKg,
        restSec: s.restSec,
        rpe: s.rpe,
        rir: s.rir,
        side: s.side,
        isWarmup: s.isWarmup ?? false,
        isWorking: !(s.isWarmup ?? false),
        isPr: s.isPr ?? false,
      });
    });
  });

  return { exercises, sets };
}

function buildSeedGraph(): SeedGraph {
  if (cache) return cache;
  const now = nowIso();
  const exerciseDefs = makeExerciseDefs(now);

  const plans: WorkoutPlan[] = [
    // 範本：上肢推力訓練（供「套用範本」示範）
    {
      daysAgo: 26,
      type: "重訓",
      startHour: 7,
      startMinute: 0,
      durationMin: 55,
      goal: "上肢推力：胸、肩、三頭",
      feeling: "good",
      isTemplate: true,
      templateName: "上肢推力訓練範本",
      exercises: [
        { exerciseName: "槓鈴臥推", sets: [{ reps: 10, weightKg: 40, isWarmup: true, restSec: 60 }, { reps: 8, weightKg: 60, rpe: 7, restSec: 90 }, { reps: 8, weightKg: 60, rpe: 8, restSec: 90 }, { reps: 6, weightKg: 62.5, rpe: 8, restSec: 120 }] },
        { exerciseName: "啞鈴肩推", sets: [{ reps: 10, weightKg: 16, rpe: 7, restSec: 75 }, { reps: 10, weightKg: 16, rpe: 8, restSec: 75 }, { reps: 8, weightKg: 18, rpe: 8, restSec: 90 }] },
        { exerciseName: "三頭下壓", sets: [{ reps: 12, weightKg: 25, rpe: 7, restSec: 60 }, { reps: 12, weightKg: 25, rpe: 8, restSec: 60 }] },
      ],
    },
    // 重訓：胸推日（進度遞增，展示訓練容量成長）
    {
      daysAgo: 24,
      type: "重訓",
      startHour: 7,
      startMinute: 15,
      durationMin: 60,
      goal: "胸推 3x8 突破 PR",
      rpe: 8,
      avgHr: 128,
      calories: 380,
      feeling: "good",
      notes: "睡眠充足，狀態不錯。",
      exercises: [
        { exerciseName: "槓鈴臥推", sets: [{ reps: 10, weightKg: 40, isWarmup: true, restSec: 60 }, { reps: 8, weightKg: 60, rpe: 7, restSec: 90 }, { reps: 8, weightKg: 62.5, rpe: 8, restSec: 90 }, { reps: 6, weightKg: 65, rpe: 9, restSec: 120 }] },
        { exerciseName: "上斜啞鈴臥推", sets: [{ reps: 10, weightKg: 20, rpe: 7, restSec: 75 }, { reps: 10, weightKg: 20, rpe: 8, restSec: 75 }, { reps: 8, weightKg: 22, rpe: 8, restSec: 90 }] },
        { exerciseName: "三頭下壓", sets: [{ reps: 12, weightKg: 25, rpe: 7, restSec: 60 }, { reps: 12, weightKg: 27.5, rpe: 8, restSec: 60 }] },
      ],
    },
    {
      daysAgo: 22,
      type: "跑步",
      startHour: 6,
      startMinute: 30,
      durationMin: 32,
      avgHr: 152,
      calories: 310,
      feeling: "normal",
      rpe: 6,
      distanceKm: 5.2,
      paceMinPerKm: 6.15,
      avgSpeedKmh: 9.8,
      steps: 6100,
      notes: "河濱公園慢跑，微風。",
    },
    {
      daysAgo: 21,
      type: "重訓",
      startHour: 7,
      startMinute: 0,
      durationMin: 65,
      goal: "背部拉力 + 硬舉",
      rpe: 8,
      avgHr: 132,
      calories: 400,
      feeling: "good",
      exercises: [
        { exerciseName: "硬舉", sets: [{ reps: 8, weightKg: 60, isWarmup: true, restSec: 60 }, { reps: 5, weightKg: 90, rpe: 7, restSec: 120 }, { reps: 5, weightKg: 100, rpe: 8, restSec: 150 }, { reps: 3, weightKg: 107.5, rpe: 9, restSec: 180 }] },
        { exerciseName: "引體向上", sets: [{ reps: 8, rpe: 7, restSec: 90 }, { reps: 7, rpe: 8, restSec: 90 }, { reps: 6, rpe: 8, restSec: 90 }] },
        { exerciseName: "槓鈴划船", sets: [{ reps: 10, weightKg: 45, rpe: 7, restSec: 75 }, { reps: 10, weightKg: 47.5, rpe: 8, restSec: 75 }] },
      ],
    },
    {
      daysAgo: 19,
      type: "瑜伽",
      startHour: 8,
      startMinute: 0,
      durationMin: 40,
      rpe: 3,
      feeling: "energetic",
      notes: "晨間流動瑜伽，著重髖關節活動度。",
    },
    {
      daysAgo: 18,
      type: "重訓",
      startHour: 19,
      startMinute: 0,
      durationMin: 58,
      goal: "腿部：深蹲 + 分腿蹲",
      rpe: 9,
      avgHr: 138,
      calories: 420,
      feeling: "tired",
      notes: "工作日晚訓，稍微疲累但完成計畫組數。",
      exercises: [
        { exerciseName: "槓鈴深蹲", sets: [{ reps: 10, weightKg: 50, isWarmup: true, restSec: 60 }, { reps: 6, weightKg: 80, rpe: 8, restSec: 120 }, { reps: 6, weightKg: 85, rpe: 8, restSec: 150 }, { reps: 4, weightKg: 90, rpe: 9, restSec: 180 }] },
        { exerciseName: "保加利亞分腿蹲", sets: [{ reps: 10, weightKg: 14, side: "left", rpe: 7, restSec: 60 }, { reps: 10, weightKg: 14, side: "right", rpe: 7, restSec: 60 }, { reps: 8, weightKg: 16, side: "left", rpe: 8, restSec: 60 }, { reps: 8, weightKg: 16, side: "right", rpe: 8, restSec: 60 }] },
      ],
    },
    {
      daysAgo: 16,
      type: "單車",
      startHour: 6,
      startMinute: 0,
      durationMin: 48,
      avgHr: 140,
      calories: 350,
      feeling: "good",
      rpe: 6,
      distanceKm: 18.4,
      avgSpeedKmh: 23,
      notes: "河堤自行車道，來回。",
    },
    {
      daysAgo: 14,
      type: "重訓",
      startHour: 7,
      startMinute: 10,
      durationMin: 62,
      goal: "胸推挑戰新重量",
      rpe: 9,
      avgHr: 130,
      calories: 395,
      feeling: "good",
      exercises: [
        { exerciseName: "槓鈴臥推", sets: [{ reps: 10, weightKg: 40, isWarmup: true, restSec: 60 }, { reps: 6, weightKg: 65, rpe: 8, restSec: 120 }, { reps: 5, weightKg: 67.5, rpe: 9, restSec: 150 }, { reps: 3, weightKg: 70, rpe: 9, restSec: 180, isPr: true }] },
        { exerciseName: "上斜啞鈴臥推", sets: [{ reps: 10, weightKg: 22, rpe: 8, restSec: 75 }, { reps: 8, weightKg: 24, rpe: 8, restSec: 90 }] },
        { exerciseName: "三頭下壓", sets: [{ reps: 12, weightKg: 27.5, rpe: 8, restSec: 60 }, { reps: 10, weightKg: 30, rpe: 8, restSec: 60 }] },
      ],
    },
    {
      daysAgo: 12,
      type: "伸展",
      startHour: 21,
      startMinute: 30,
      durationMin: 20,
      rpe: 2,
      feeling: "normal",
      notes: "睡前靜態伸展，放鬆下背與髖屈肌。",
    },
    {
      daysAgo: 11,
      type: "重訓",
      startHour: 7,
      startMinute: 0,
      durationMin: 60,
      goal: "背部：硬舉挑戰 PR",
      rpe: 9,
      avgHr: 134,
      calories: 410,
      feeling: "good",
      exercises: [
        { exerciseName: "硬舉", sets: [{ reps: 8, weightKg: 60, isWarmup: true, restSec: 60 }, { reps: 5, weightKg: 100, rpe: 8, restSec: 120 }, { reps: 3, weightKg: 110, rpe: 9, restSec: 180 }, { reps: 2, weightKg: 115, rpe: 9, restSec: 180, isPr: true }] },
        { exerciseName: "滑輪下拉", sets: [{ reps: 10, weightKg: 50, rpe: 7, restSec: 75 }, { reps: 10, weightKg: 52.5, rpe: 8, restSec: 75 }] },
        { exerciseName: "二頭彎舉", sets: [{ reps: 12, weightKg: 12, rpe: 7, restSec: 60 }, { reps: 10, weightKg: 13, rpe: 8, restSec: 60 }] },
      ],
    },
    {
      daysAgo: 9,
      type: "步行",
      startHour: 12,
      startMinute: 15,
      durationMin: 35,
      avgHr: 105,
      calories: 140,
      feeling: "normal",
      rpe: 3,
      distanceKm: 2.8,
      steps: 3900,
      notes: "午休散步。",
    },
    {
      daysAgo: 7,
      type: "重訓",
      startHour: 19,
      startMinute: 30,
      durationMin: 55,
      goal: "腿部維持訓練",
      rpe: 7,
      avgHr: 126,
      calories: 360,
      feeling: "normal",
      exercises: [
        { exerciseName: "槓鈴深蹲", sets: [{ reps: 10, weightKg: 50, isWarmup: true, restSec: 60 }, { reps: 8, weightKg: 75, rpe: 7, restSec: 120 }, { reps: 8, weightKg: 77.5, rpe: 7, restSec: 120 }] },
        { exerciseName: "羅馬尼亞硬舉", sets: [{ reps: 10, weightKg: 50, rpe: 7, restSec: 90 }, { reps: 10, weightKg: 52.5, rpe: 7, restSec: 90 }] },
        { exerciseName: "棒式", sets: [{ reps: 1, restSec: 45, rpe: 6 }, { reps: 1, restSec: 45, rpe: 7 }] },
      ],
    },
    {
      daysAgo: 5,
      type: "游泳",
      startHour: 6,
      startMinute: 45,
      durationMin: 40,
      avgHr: 128,
      calories: 300,
      feeling: "good",
      rpe: 6,
      distanceKm: 1.2,
      notes: "自由式為主，配合換氣訓練。",
    },
    {
      daysAgo: 4,
      type: "重訓",
      startHour: 7,
      startMinute: 5,
      durationMin: 63,
      goal: "胸推 + 肩部",
      rpe: 8,
      avgHr: 131,
      calories: 400,
      feeling: "energetic",
      exercises: [
        { exerciseName: "槓鈴臥推", sets: [{ reps: 10, weightKg: 40, isWarmup: true, restSec: 60 }, { reps: 8, weightKg: 62.5, rpe: 7, restSec: 90 }, { reps: 6, weightKg: 67.5, rpe: 8, restSec: 120 }, { reps: 5, weightKg: 70, rpe: 8, restSec: 150 }] },
        { exerciseName: "側平舉", sets: [{ reps: 15, weightKg: 8, rpe: 7, restSec: 45 }, { reps: 15, weightKg: 8, rpe: 8, restSec: 45 }] },
        { exerciseName: "伏地挺身", sets: [{ reps: 20, rpe: 7, restSec: 60 }, { reps: 18, rpe: 8, restSec: 60 }] },
      ],
    },
    {
      daysAgo: 2,
      type: "復健",
      startHour: 18,
      startMinute: 0,
      durationMin: 30,
      rpe: 4,
      feeling: "normal",
      goal: "肩關節活動度與旋轉肌群穩定",
      notes: "物理治療師建議動作，強度低。",
      exercises: [{ exerciseName: "側平舉", sets: [{ reps: 15, weightKg: 3, rpe: 4, restSec: 45 }, { reps: 15, weightKg: 3, rpe: 4, restSec: 45 }] }],
    },
    {
      daysAgo: 0,
      type: "重訓",
      startHour: 7,
      startMinute: 0,
      durationMin: 60,
      goal: "全身：農夫走路收尾",
      rpe: 8,
      avgHr: 133,
      calories: 405,
      feeling: "good",
      exercises: [
        { exerciseName: "槓鈴深蹲", sets: [{ reps: 10, weightKg: 50, isWarmup: true, restSec: 60 }, { reps: 6, weightKg: 87.5, rpe: 8, restSec: 150 }, { reps: 5, weightKg: 90, rpe: 8, restSec: 150 }] },
        { exerciseName: "農夫走路", sets: [{ reps: 1, weightKg: 24, restSec: 90, rpe: 8 }, { reps: 1, weightKg: 24, restSec: 90, rpe: 8 }] },
        { exerciseName: "捲腹", sets: [{ reps: 20, rpe: 6, restSec: 45 }, { reps: 20, rpe: 7, restSec: 45 }] },
      ],
    },
  ];

  const workouts: Workout[] = [];
  const workoutExercises: WorkoutExercise[] = [];
  const workoutSets: WorkoutSet[] = [];

  for (const plan of plans) {
    const date = isoDateDaysAgo(plan.daysAgo);
    const startAt = combineDateTime(date, `${String(plan.startHour).padStart(2, "0")}:${String(plan.startMinute).padStart(2, "0")}`);
    const endAt = new Date(new Date(startAt).getTime() + plan.durationMin * 60_000).toISOString();
    const workoutId = newId();

    workouts.push({
      id: workoutId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      date,
      startAt,
      endAt,
      type: plan.type,
      goal: plan.goal,
      durationMin: plan.durationMin,
      rpe: plan.rpe,
      avgHr: plan.avgHr,
      calories: plan.calories,
      notes: plan.notes,
      feeling: plan.feeling,
      distanceKm: plan.distanceKm,
      paceMinPerKm: plan.paceMinPerKm,
      avgSpeedKmh: plan.avgSpeedKmh,
      steps: plan.steps,
      isTemplate: plan.isTemplate ?? false,
      templateName: plan.templateName,
    });

    if (plan.exercises && plan.exercises.length > 0) {
      const { exercises, sets } = buildStrengthGraph(exerciseDefs, now, workoutId, plan.exercises);
      workoutExercises.push(...exercises);
      workoutSets.push(...sets);
    }
  }

  cache = { exerciseDefs, workouts, workoutExercises, workoutSets };
  return cache;
}

export function seedExerciseDefs(): ExerciseDef[] {
  return buildSeedGraph().exerciseDefs;
}

export function seedWorkouts(): Workout[] {
  return buildSeedGraph().workouts;
}

export function seedWorkoutExercises(): WorkoutExercise[] {
  return buildSeedGraph().workoutExercises;
}

export function seedWorkoutSets(): WorkoutSet[] {
  return buildSeedGraph().workoutSets;
}
