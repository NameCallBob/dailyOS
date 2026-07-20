/**
 * features/symptoms/seed.ts — 試用模式種子資料。
 *
 * symptom_defs 與 symptom_logs 由各自獨立的 lazy-seed 觸發（見 lib/resource.ts），
 * 兩者建立時間點不一定相同，故 symptom_logs 不能用「執行當下產生的隨機 id」去關聯
 * symptom_defs，而是共用一組固定字串 id（SYMPTOM_DEF_IDS）。
 */

import { nowIso } from "@/lib/resource";
import type { SymptomDefinition, SymptomLog } from "./schema";

export const SYMPTOM_DEF_IDS = {
  migraine: "seed-symptom-def-migraine",
  lowerBack: "seed-symptom-def-lower-back",
  kneeAche: "seed-symptom-def-knee-ache",
  handNumbness: "seed-symptom-def-hand-numbness",
  ankleSwelling: "seed-symptom-def-ankle-swelling",
  fatigue: "seed-symptom-def-fatigue",
  anxiety: "seed-symptom-def-anxiety",
  workStress: "seed-symptom-def-work-stress",
} as const;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function startAtFor(daysAgo: number, hour: number, minute: number): string {
  const date = daysAgoIso(daysAgo);
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`).toISOString();
}

export function seedSymptomDefs(): SymptomDefinition[] {
  const now = nowIso();
  const base = { createdAt: now, updatedAt: now, version: 1, deleted: false, archived: false };
  const defs: SymptomDefinition[] = [
    { ...base, id: SYMPTOM_DEF_IDS.migraine, name: "偏頭痛", category: "頭痛", note: "常伴隨畏光與噁心感" },
    { ...base, id: SYMPTOM_DEF_IDS.lowerBack, name: "下背痛", category: "疼痛", note: "久坐後加劇" },
    { ...base, id: SYMPTOM_DEF_IDS.kneeAche, name: "右膝痠痛", category: "痠", note: "跑步或爬樓梯後明顯" },
    { ...base, id: SYMPTOM_DEF_IDS.handNumbness, name: "手指麻木", category: "麻", note: "打字久了容易出現" },
    { ...base, id: SYMPTOM_DEF_IDS.ankleSwelling, name: "腳踝腫脹", category: "腫脹", note: "久站一整天後" },
    { ...base, id: SYMPTOM_DEF_IDS.fatigue, name: "慢性疲勞", category: "疲勞", note: "睡足仍感疲倦" },
    { ...base, id: SYMPTOM_DEF_IDS.anxiety, name: "焦慮情緒", category: "情緒", note: "會議前特別明顯" },
    { ...base, id: SYMPTOM_DEF_IDS.workStress, name: "工作壓力", category: "壓力", note: "月底結案期間" },
  ];
  return defs;
}

export function seedSymptomLogs(): SymptomLog[] {
  const now = nowIso();
  const base = { createdAt: now, updatedAt: now, version: 1, deleted: false };

  const rows: Array<Omit<SymptomLog, "id" | "createdAt" | "updatedAt" | "version" | "deleted">> = [
    {
      symptomDefId: SYMPTOM_DEF_IDS.migraine,
      date: daysAgoIso(27),
      startAt: startAtFor(27, 14, 20),
      intensity: 6,
      bodyLocation: "head",
      durationMin: 180,
      triggers: ["睡眠不足"],
      relief: ["休息", "藥物"],
      notes: "右側太陽穴悶痛，吃了止痛藥後緩解。",
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.lowerBack,
      date: daysAgoIso(24),
      startAt: startAtFor(24, 17, 0),
      intensity: 4,
      bodyLocation: "lower_back",
      durationMin: 60,
      triggers: ["久坐/久站", "姿勢不良"],
      relief: ["伸展"],
      notes: "下班前明顯加劇，起身走動後稍緩解。",
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.kneeAche,
      date: daysAgoIso(22),
      startAt: startAtFor(22, 19, 30),
      intensity: 3,
      bodyLocation: "knee_r",
      durationMin: 45,
      triggers: ["運動後"],
      relief: ["冰敷"],
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.anxiety,
      date: daysAgoIso(20),
      startAt: startAtFor(20, 9, 15),
      intensity: 5,
      triggers: ["壓力"],
      relief: ["深呼吸/放鬆"],
      notes: "早上開會前心跳加快、有點坐立不安。",
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.handNumbness,
      date: daysAgoIso(18),
      startAt: startAtFor(18, 15, 45),
      intensity: 2,
      bodyLocation: "wrist_hand_r",
      durationMin: 20,
      triggers: ["長時間用 3C"],
      relief: ["調整姿勢"],
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.fatigue,
      date: daysAgoIso(16),
      startAt: startAtFor(16, 8, 0),
      intensity: 5,
      triggers: ["睡眠不足"],
      relief: ["休息"],
      notes: "睡了 7 小時但起床仍很累。",
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.migraine,
      date: daysAgoIso(14),
      startAt: startAtFor(14, 11, 0),
      intensity: 9,
      bodyLocation: "head",
      durationMin: 240,
      triggers: ["天氣變化"],
      relief: ["藥物", "休息"],
      notes: "劇烈頭痛合併噁心與畏光，比平常嚴重許多，休息一下午才緩解。",
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.workStress,
      date: daysAgoIso(12),
      startAt: startAtFor(12, 22, 0),
      intensity: 6,
      triggers: ["壓力"],
      relief: ["無緩解"],
      notes: "結案期間持續緊繃，睡前仍在想工作的事。",
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.ankleSwelling,
      date: daysAgoIso(10),
      startAt: startAtFor(10, 20, 30),
      intensity: 3,
      bodyLocation: "ankle_foot_l",
      durationMin: 90,
      triggers: ["久坐/久站"],
      relief: ["冰敷", "調整姿勢"],
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.lowerBack,
      date: daysAgoIso(8),
      startAt: startAtFor(8, 7, 30),
      intensity: 5,
      bodyLocation: "lower_back",
      durationMin: 30,
      triggers: ["姿勢不良"],
      relief: ["伸展", "熱敷"],
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.kneeAche,
      date: daysAgoIso(6),
      startAt: startAtFor(6, 18, 15),
      intensity: 4,
      bodyLocation: "knee_r",
      durationMin: 40,
      triggers: ["運動後"],
      relief: ["冰敷", "休息"],
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.anxiety,
      date: daysAgoIso(4),
      startAt: startAtFor(4, 21, 0),
      intensity: 4,
      triggers: ["不明原因"],
      relief: ["深呼吸/放鬆"],
      notes: "沒有明確原因，睡前莫名有點煩躁。",
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.fatigue,
      date: daysAgoIso(2),
      startAt: startAtFor(2, 16, 0),
      intensity: 3,
      triggers: ["睡眠不足"],
      relief: ["休息"],
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.migraine,
      date: daysAgoIso(1),
      startAt: startAtFor(1, 13, 40),
      intensity: 5,
      bodyLocation: "head",
      durationMin: 90,
      triggers: ["睡眠不足", "天氣變化"],
      relief: ["藥物"],
    },
    {
      symptomDefId: SYMPTOM_DEF_IDS.workStress,
      date: daysAgoIso(0),
      startAt: startAtFor(0, 10, 5),
      intensity: 3,
      triggers: ["壓力"],
      relief: ["深呼吸/放鬆"],
      notes: "早上進度落後有點焦躁，喝杯茶後好一些。",
    },
  ];

  return rows.map((row, index) => ({
    ...base,
    id: `seed-symptom-log-${index + 1}`,
    ...row,
  }));
}
