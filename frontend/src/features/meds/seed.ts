/**
 * features/meds/seed.ts — 試用模式（Dexie）種子資料。
 *
 * medications / supplements：各 6-8 筆常見用藥情境（處方藥、慢性病藥、保健品）。
 * medication_schedules：依各筆的 times[] 展開對應時段（供提醒/紀錄關聯）。
 * medication_logs：近 30 天內依排程產生服用/漏服紀錄，刻意保留缺漏避免資料過於「完美」。
 *
 * 注意：種子資料僅為情境示範，不代表任何用藥建議；劑量/頻率皆為使用者可自行編輯的示意值。
 */

import { nowIso } from "@/lib/resource";
import { addDays, lastNDays, today } from "./date";
import {
  type Frequency,
  type LogStatus,
  type Medication,
  type MedicationLog,
  type MedicationSchedule,
  type SourceType,
  type Supplement,
  type WithFoodOption,
} from "./types";

interface ItemSeedDef {
  id: string;
  name: string;
  dose: number;
  unit: string;
  frequency: Frequency;
  daysOfWeek?: number[];
  intervalDays?: number;
  times: string[];
  startDaysAgo: number;
  endDate?: string;
  withFood: WithFoodOption;
  remainingQty?: number;
  refillEnabled?: boolean;
  refillThreshold?: number;
  active: boolean;
  notes?: string;
  /** 排程日服用機率，用來產生近似真實的紀錄（含漏服） */
  takenRate: number;
}

const MEDICATION_DEFS: ItemSeedDef[] = [
  {
    id: "med-bp",
    name: "脈優（Amlodipine）",
    dose: 5,
    unit: "mg",
    frequency: "daily",
    times: ["08:00"],
    startDaysAgo: 120,
    withFood: "either",
    remainingQty: 18,
    refillEnabled: true,
    refillThreshold: 10,
    active: true,
    notes: "心臟科回診領藥，隨手邊早餐一起吃。",
    takenRate: 0.92,
  },
  {
    id: "med-thyroid",
    name: "優甲樂（Levothyroxine）",
    dose: 50,
    unit: "mcg",
    frequency: "daily",
    times: ["06:30"],
    startDaysAgo: 200,
    withFood: "empty_stomach",
    remainingQty: 6,
    refillEnabled: true,
    refillThreshold: 7,
    active: true,
    notes: "需空腹服用，起床後先吃藥再等 30 分鐘吃早餐。",
    takenRate: 0.85,
  },
  {
    id: "med-antibiotic",
    name: "安莫西林（Amoxicillin）",
    dose: 500,
    unit: "mg",
    frequency: "daily",
    times: ["08:00", "14:00", "20:00"],
    startDaysAgo: 6,
    endDate: addDays(today(), 1),
    withFood: "with_food",
    remainingQty: 3,
    refillEnabled: false,
    active: true,
    notes: "牙科術後抗生素，需服完整個療程。",
    takenRate: 0.9,
  },
  {
    id: "med-allergy",
    name: "艾來錠（Loratadine）",
    dose: 10,
    unit: "mg",
    frequency: "as-needed",
    times: [],
    startDaysAgo: 30,
    withFood: "either",
    remainingQty: 12,
    refillEnabled: true,
    refillThreshold: 5,
    active: true,
    notes: "花粉季或鼻子癢時服用一顆。",
    takenRate: 0.4,
  },
  {
    id: "med-migraine",
    name: "止痛錠（Ibuprofen）",
    dose: 400,
    unit: "mg",
    frequency: "as-needed",
    times: [],
    startDaysAgo: 15,
    withFood: "with_food",
    remainingQty: 2,
    refillEnabled: true,
    refillThreshold: 4,
    active: true,
    notes: "偏頭痛發作時服用，避免空腹吃。",
    takenRate: 0.3,
  },
  {
    id: "med-sleep",
    name: "史蒂諾斯（Zolpidem）",
    dose: 10,
    unit: "mg",
    frequency: "specific-days",
    daysOfWeek: [0, 1, 2, 3, 4],
    times: ["22:30"],
    startDaysAgo: 40,
    withFood: "empty_stomach",
    remainingQty: 4,
    refillEnabled: true,
    refillThreshold: 5,
    active: true,
    notes: "精神科處方，僅平日睡前使用；假日盡量不依賴。",
    takenRate: 0.65,
  },
  {
    id: "med-old-course",
    name: "普拿疼加強錠",
    dose: 500,
    unit: "mg",
    frequency: "every-n-days",
    intervalDays: 3,
    times: ["12:00"],
    startDaysAgo: 90,
    endDate: addDays(today(), -50),
    withFood: "either",
    remainingQty: 0,
    refillEnabled: false,
    active: false,
    notes: "舊傷復健期間使用，已停用。",
    takenRate: 0.8,
  },
];

const SUPPLEMENT_DEFS: ItemSeedDef[] = [
  {
    id: "supp-vitamind",
    name: "維生素 D3",
    dose: 1000,
    unit: "IU",
    frequency: "daily",
    times: ["08:30"],
    startDaysAgo: 150,
    withFood: "with_food",
    remainingQty: 25,
    refillEnabled: true,
    refillThreshold: 10,
    active: true,
    notes: "隨早餐一起吃，日曬少的季節更要記得。",
    takenRate: 0.75,
  },
  {
    id: "supp-fishoil",
    name: "魚油 Omega-3",
    dose: 1000,
    unit: "mg",
    frequency: "daily",
    times: ["08:30", "20:00"],
    startDaysAgo: 100,
    withFood: "with_food",
    remainingQty: 8,
    refillEnabled: true,
    refillThreshold: 10,
    active: true,
    notes: "早晚各一顆，隨餐服用減少魚腥味回流。",
    takenRate: 0.7,
  },
  {
    id: "supp-magnesium",
    name: "鎂補充錠",
    dose: 200,
    unit: "mg",
    frequency: "daily",
    times: ["21:30"],
    startDaysAgo: 60,
    withFood: "either",
    remainingQty: 14,
    refillEnabled: true,
    refillThreshold: 8,
    active: true,
    notes: "睡前吃，據說有助放鬆；純個人習慣記錄。",
    takenRate: 0.68,
  },
  {
    id: "supp-probiotic",
    name: "益生菌",
    dose: 1,
    unit: "包",
    frequency: "daily",
    times: ["07:30"],
    startDaysAgo: 45,
    withFood: "empty_stomach",
    remainingQty: 3,
    refillEnabled: true,
    refillThreshold: 5,
    active: true,
    notes: "空腹配溫水，冰箱冷藏保存。",
    takenRate: 0.6,
  },
  {
    id: "supp-multivitamin",
    name: "綜合維他命",
    dose: 1,
    unit: "顆",
    frequency: "daily",
    times: ["08:30"],
    startDaysAgo: 200,
    withFood: "with_food",
    remainingQty: 40,
    refillEnabled: true,
    refillThreshold: 15,
    active: true,
    notes: "",
    takenRate: 0.8,
  },
  {
    id: "supp-collagen",
    name: "膠原蛋白粉",
    dose: 5,
    unit: "克",
    frequency: "specific-days",
    daysOfWeek: [1, 3, 5],
    times: ["21:00"],
    startDaysAgo: 25,
    withFood: "either",
    remainingQty: 6,
    refillEnabled: true,
    refillThreshold: 3,
    active: true,
    notes: "泡在溫水或牛奶裡，隔日一次。",
    takenRate: 0.55,
  },
];

function isScheduledOn(def: ItemSeedDef, dateStr: string, createdAt: string): boolean {
  const weekday = new Date(dateStr).getDay();
  switch (def.frequency) {
    case "daily":
      return true;
    case "specific-days":
      return (def.daysOfWeek ?? []).includes(weekday);
    case "every-n-days": {
      const n = def.intervalDays ?? 2;
      const start = createdAt.slice(0, 10);
      const diffMs = new Date(dateStr).getTime() - new Date(start).getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      return diffDays >= 0 && diffDays % n === 0;
    }
    case "as-needed":
      return false;
    default:
      return true;
  }
}

function buildItem(def: ItemSeedDef): Medication {
  const createdAt = addDays(today(), -def.startDaysAgo) + "T08:00:00.000Z";
  return {
    id: def.id,
    createdAt,
    updatedAt: nowIso(),
    version: 1,
    deleted: false,
    name: def.name,
    dose: def.dose,
    unit: def.unit,
    frequency: def.frequency,
    daysOfWeek: def.daysOfWeek,
    intervalDays: def.intervalDays,
    times: def.times,
    startDate: addDays(today(), -def.startDaysAgo),
    endDate: def.endDate,
    withFood: def.withFood,
    remainingQty: def.remainingQty,
    refillReminder: def.refillEnabled === undefined ? undefined : { enabled: def.refillEnabled, thresholdQty: def.refillThreshold ?? 0 },
    active: def.active,
    notes: def.notes || undefined,
  };
}

export function seedMedications(): Medication[] {
  return MEDICATION_DEFS.map(buildItem);
}

export function seedSupplements(): Supplement[] {
  return SUPPLEMENT_DEFS.map(buildItem);
}

function buildSchedules(defs: ItemSeedDef[], sourceType: SourceType): MedicationSchedule[] {
  const out: MedicationSchedule[] = [];
  for (const def of defs) {
    for (const time of def.times) {
      out.push({
        id: `sched-${def.id}-${time}`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        version: 1,
        deleted: false,
        medicationId: def.id,
        sourceType,
        timeOfDay: time,
        active: def.active,
      });
    }
  }
  return out;
}

export function seedMedicationSchedules(): MedicationSchedule[] {
  return [...buildSchedules(MEDICATION_DEFS, "medication"), ...buildSchedules(SUPPLEMENT_DEFS, "supplement")];
}

function buildLogs(defs: ItemSeedDef[], sourceType: SourceType): MedicationLog[] {
  const out: MedicationLog[] = [];
  const days = lastNDays(30);

  for (const def of defs) {
    const createdAt = addDays(today(), -def.startDaysAgo) + "T08:00:00.000Z";
    const startDateStr = addDays(today(), -def.startDaysAgo);
    for (const date of days) {
      if (date < startDateStr) continue;
      if (def.endDate && date > def.endDate) continue;
      if (!isScheduledOn(def, date, createdAt)) continue;

      const times = def.times.length > 0 ? def.times : ["12:00"];
      for (const time of times) {
        const scheduledFor = `${date}T${time}:00.000Z`;
        // 未來日期不產生紀錄
        if (scheduledFor > nowIso()) continue;

        const roll = pseudoRandom(`${def.id}-${date}-${time}`);
        let status: LogStatus;
        if (roll < def.takenRate) status = "taken";
        else if (roll < def.takenRate + 0.08) status = "skipped";
        else status = "missed";

        out.push({
          id: `log-${def.id}-${date}-${time}`,
          createdAt: scheduledFor,
          updatedAt: scheduledFor,
          version: 1,
          deleted: false,
          medicationId: def.id,
          sourceType,
          scheduleId: `sched-${def.id}-${time}`,
          scheduledFor,
          status,
          takenAt: status === "taken" ? scheduledFor : undefined,
          quantity: status === "taken" ? def.dose : undefined,
        });
      }
    }
  }
  return out;
}

function pseudoRandom(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

export function seedMedicationLogs(): MedicationLog[] {
  return [...buildLogs(MEDICATION_DEFS, "medication"), ...buildLogs(SUPPLEMENT_DEFS, "supplement")];
}
