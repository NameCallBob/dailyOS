/**
 * features/rehab/seed.ts — 試用模式（Dexie）種子資料。
 *
 * 情境：
 * - rehab_plans：2 個計畫 —— 一個進行中的「右膝前十字韌帶術後復健」，一個已完成的
 *   「右肩夾擠症候群復健」（示範計畫可被停用／結案，但歷史紀錄保留）。
 * - rehab_exercises：兩計畫合計 8 個項目，含生效日／部分已停止（治療師調整過處方）。
 * - rehab_sessions：依各項目生效日至今，模擬近 30 天內非每天都執行、不適感隨時間
 *   略為下降但仍有波動的真實紀錄；刻意保留缺漏與偶爾偷懶的紀錄，避免資料過於「完美」。
 *
 * 注意：種子資料中的 sets/reps/durationSec/loadLimit 皆維持治療師原始處方，
 * 不因時間推進而自動增加，呼應「系統不得自行增加復健強度」的原則。
 */

import { newId, nowIso } from "@/lib/resource";
import type { RehabExercise, RehabPlan, RehabSession } from "./schema";

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const now = nowIso();

const PLAN_KNEE_ID = "rehab-plan-knee-acl";
const PLAN_SHOULDER_ID = "rehab-plan-shoulder-impingement";

export function seedRehabPlans(): RehabPlan[] {
  return [
    {
      id: PLAN_KNEE_ID,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      name: "右膝前十字韌帶術後復健",
      bodyRegion: "膝關節",
      diagnosis: "右膝前十字韌帶重建術後（術後第 10 週）",
      goal: "恢復右膝完整活動角度與股四頭肌力，逐步回歸日常爬樓梯與慢跑",
      therapistName: "陳信宏 物理治療師",
      clinicName: "康復物理治療所",
      active: true,
      startDate: isoDateDaysAgo(42),
      nextAppointmentAt: isoDateDaysAgo(-7),
      generalCautions: "若執行後膝關節腫脹明顯增加或疼痛超過 5 分，請停止並提前回診，勿自行加重負荷。",
      reviewNotes: [
        {
          id: newId(),
          date: isoDateDaysAgo(28),
          note: "術後第 6 週回診：X 光顯示癒合良好，活動角度達 0–110°，同意增加直膝抬腿組數（治療師已於系統中調整處方）。",
          adjustment: true,
        },
        {
          id: newId(),
          date: isoDateDaysAgo(14),
          note: "術後第 8 週回診：肌力測試進步，開始加入靠牆蹲訓練；提醒避免深蹲超過 90°。",
          adjustment: true,
        },
      ],
      note: "每次訓練前先熱敷 10 分鐘、訓練後冰敷 15 分鐘。",
    },
    {
      id: PLAN_SHOULDER_ID,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      name: "右肩夾擠症候群復健",
      bodyRegion: "肩關節",
      diagnosis: "右肩旋轉肌袖夾擠症候群",
      goal: "消除夾擠疼痛、恢復肩關節上舉角度",
      therapistName: "林佳穎 物理治療師",
      clinicName: "康復物理治療所",
      active: false,
      startDate: isoDateDaysAgo(120),
      generalCautions: "上舉過程若出現尖銳疼痛請立即停止。",
      reviewNotes: [
        {
          id: newId(),
          date: isoDateDaysAgo(65),
          note: "症狀已改善，疼痛評分降至 1 分以下，肩關節活動角度恢復正常，結案並停止例行復健，僅需居家保養伸展。",
          adjustment: false,
        },
      ],
      note: "已結案，保留紀錄供未來若復發時參考。",
    },
  ];
}

interface ExerciseSeedDef {
  id: string;
  rehabPlanId: string;
  name: string;
  instructions: string;
  media?: string;
  sets?: number;
  reps?: number;
  durationSec?: number;
  loadLimit?: string;
  angle?: string;
  cautions?: string;
  frequency?: string;
  therapistNote?: string;
  effectiveDaysAgo: number;
  stopDaysAgo?: number;
  order: number;
}

const EXERCISE_DEFS: ExerciseSeedDef[] = [
  {
    id: "rehab-ex-slr",
    rehabPlanId: PLAN_KNEE_ID,
    name: "直膝抬腿（SLR）",
    instructions: "平躺，健側膝彎曲踩地，患側膝打直後緩慢抬高至與對側大腿同高，停留 3 秒再放下。",
    sets: 3,
    reps: 15,
    loadLimit: "無額外負重",
    angle: "抬高約 30–45°",
    cautions: "抬腿過程膝蓋需保持完全伸直，避免用髖部代償。",
    frequency: "每天 2 回，每週 7 天",
    therapistNote: "術後第 6 週回診已同意由 10 下調整為 15 下，請依此執行，勿自行再增加。",
    effectiveDaysAgo: 28,
    order: 1,
  },
  {
    id: "rehab-ex-quad-set",
    rehabPlanId: PLAN_KNEE_ID,
    name: "股四頭肌等長收縮",
    instructions: "膝下墊毛巾捲，用力將膝蓋往下壓、繃緊大腿前側肌肉，維持 5 秒後放鬆。",
    sets: 3,
    reps: 20,
    loadLimit: "無負重（自身肌力）",
    frequency: "每天 3 回",
    effectiveDaysAgo: 42,
    order: 2,
  },
  {
    id: "rehab-ex-wall-squat",
    rehabPlanId: PLAN_KNEE_ID,
    name: "靠牆蹲（迷你深蹲）",
    instructions: "背靠牆緩慢下蹲至膝屈曲角度上限，維持後緩慢起身。",
    sets: 3,
    reps: 10,
    durationSec: 20,
    loadLimit: "僅自身體重，不可額外加重",
    angle: "膝屈曲上限 90°，不可超過",
    cautions: "膝蓋不可超過腳尖；若出現疼痛立即停止並回報治療師，切勿自行增加下蹲深度。",
    frequency: "每天 1 回",
    therapistNote: "術後第 8 週回診新增，先以角度上限 90° 練習，下次回診再評估是否放寬。",
    effectiveDaysAgo: 14,
    order: 3,
  },
  {
    id: "rehab-ex-hamstring-curl",
    rehabPlanId: PLAN_KNEE_ID,
    name: "彈力帶勾腿",
    instructions: "俯臥，彈力帶固定腳踝，緩慢將小腿向臀部方向彎曲。",
    sets: 3,
    reps: 12,
    loadLimit: "彈力帶黃色（輕阻力）以下，未經評估不可換用更強阻力帶",
    frequency: "隔天 1 次",
    effectiveDaysAgo: 21,
    order: 4,
  },
  {
    id: "rehab-ex-rom",
    rehabPlanId: PLAN_KNEE_ID,
    name: "膝關節活動度訓練（腳踏車式）",
    instructions: "坐姿，患側腳跟在地板上緩慢前後滑動，逐步增加彎曲角度。",
    durationSec: 300,
    angle: "現階段上限 110°，依回診評估調整",
    frequency: "每天 1 回",
    effectiveDaysAgo: 42,
    order: 5,
  },
  {
    id: "rehab-ex-shoulder-pendulum",
    rehabPlanId: PLAN_SHOULDER_ID,
    name: "肩鐘擺運動",
    instructions: "身體前傾，患側手臂自然下垂並輕輕畫圈擺動。",
    sets: 2,
    reps: 15,
    durationSec: 60,
    loadLimit: "無負重",
    frequency: "每天 2 回",
    effectiveDaysAgo: 120,
    stopDaysAgo: 65,
    order: 1,
  },
  {
    id: "rehab-ex-shoulder-external-rotation",
    rehabPlanId: PLAN_SHOULDER_ID,
    name: "肩外旋彈力帶訓練",
    instructions: "手肘夾緊身體呈 90°，彈力帶固定於另一端，緩慢向外旋轉。",
    sets: 3,
    reps: 12,
    loadLimit: "彈力帶紅色（中阻力）",
    frequency: "隔天 1 次",
    effectiveDaysAgo: 110,
    stopDaysAgo: 65,
    order: 2,
  },
  {
    id: "rehab-ex-shoulder-flexion-stretch",
    rehabPlanId: PLAN_SHOULDER_ID,
    name: "肩上舉伸展（居家保養）",
    instructions: "手扶門框，身體緩慢前傾以伸展肩關節上舉角度，停留 20 秒。",
    sets: 3,
    durationSec: 20,
    angle: "以不引起尖銳疼痛為上限",
    frequency: "每週 3 次（保養用，非急性期處方）",
    therapistNote: "結案後改為保養性質，僅需視情況執行，非強制。",
    effectiveDaysAgo: 65,
    order: 3,
  },
];

export function seedRehabExercises(): RehabExercise[] {
  return EXERCISE_DEFS.map((def) => {
    const exercise: RehabExercise = {
      id: def.id,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      rehabPlanId: def.rehabPlanId,
      name: def.name,
      instructions: def.instructions,
      media: def.media,
      sets: def.sets,
      reps: def.reps,
      durationSec: def.durationSec,
      loadLimit: def.loadLimit,
      angle: def.angle,
      cautions: def.cautions,
      frequency: def.frequency,
      therapistNote: def.therapistNote,
      effectiveDate: isoDateDaysAgo(def.effectiveDaysAgo),
      stopDate: def.stopDaysAgo !== undefined ? isoDateDaysAgo(def.stopDaysAgo) : undefined,
      order: def.order,
    };
    return exercise;
  });
}

/** 簡易可重現的偽隨機數（避免每次載入種子資料都不同，方便測試）。 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function seedRehabSessions(): RehabSession[] {
  const sessions: RehabSession[] = [];
  const exercises = EXERCISE_DEFS;
  let seedCounter = 1;

  for (const exercise of exercises) {
    const startDaysAgo = Math.min(exercise.effectiveDaysAgo, 29);
    const endDaysAgo = exercise.stopDaysAgo ?? 0;
    if (endDaysAgo > startDaysAgo) continue; // 已於近 30 天前就停止，近期無紀錄

    for (let daysAgo = startDaysAgo; daysAgo >= endDaysAgo; daysAgo -= 1) {
      seedCounter += 1;
      const r = pseudoRandom(seedCounter * 7.13 + exercise.order);
      // 模擬真實使用者：約 78% 天數有執行，其餘缺漏
      const executed = r < 0.78;
      if (!executed) continue;

      const date = isoDateDaysAgo(daysAgo);
      const progressRatio = 1 - daysAgo / Math.max(startDaysAgo, 1); // 0（最早）→ 1（最近）
      const baseBefore = exercise.rehabPlanId === PLAN_KNEE_ID ? 4 : 3;
      const discomfortBefore = Math.max(0, Math.round(baseBefore - progressRatio * 2 + (pseudoRandom(seedCounter) - 0.5) * 2));
      const discomfortAfter = Math.max(0, Math.min(10, discomfortBefore + (pseudoRandom(seedCounter * 1.7) < 0.7 ? -1 : 1)));
      const done = pseudoRandom(seedCounter * 2.3) < 0.92;

      sessions.push({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        version: 1,
        deleted: false,
        rehabPlanId: exercise.rehabPlanId,
        rehabExerciseId: exercise.id,
        date,
        done,
        actualSets: done ? exercise.sets : exercise.sets ? Math.max(0, exercise.sets - 1) : undefined,
        actualReps: done ? exercise.reps : exercise.reps,
        actualTime: done ? exercise.durationSec : exercise.durationSec,
        discomfortBefore: Math.min(10, discomfortBefore),
        discomfortAfter,
        load: exercise.loadLimit,
        notes: !done && pseudoRandom(seedCounter * 3.1) < 0.4 ? "當天時間不夠，只完成部分組數。" : undefined,
      });
    }
  }

  return sessions;
}
