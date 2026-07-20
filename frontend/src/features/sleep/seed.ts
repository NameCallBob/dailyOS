/**
 * features/sleep/seed.ts — 試用模式種子資料。
 * 逼真的繁體中文使用情境：近 30 天、非每日記錄（模擬真實使用頻率並刻意留下資料缺口），
 * 平日／假日作息略有差異，睡前活動與備註多樣化，供趨勢圖與規律度／關聯分析有足夠樣本。
 */

import { newId, nowIso } from "@/lib/resource";
import type { PreSleepActivity, SleepLog } from "./schema";
import { computeHours } from "./utils";

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function atTime(dateIso: string, hour: number, minute: number): Date {
  return new Date(`${dateIso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
}

interface SeedPlanEntry {
  /** 起床日距今天數（即紀錄所屬 date） */
  wakeDaysAgo: number;
  bedHour: number;
  bedMinute: number;
  /** 上床到入睡的等待分鐘數 */
  latencyMinutes: number;
  wakeHour: number;
  wakeMinute: number;
  awakenings: number;
  quality: number;
  morningEnergy: number;
  activity: PreSleepActivity;
  notes?: string;
}

const PLAN: SeedPlanEntry[] = [
  { wakeDaysAgo: 29, bedHour: 23, bedMinute: 20, latencyMinutes: 15, wakeHour: 7, wakeMinute: 0, awakenings: 0, quality: 4, morningEnergy: 4, activity: "reading", notes: "睡前看了半小時書，很快入睡" },
  { wakeDaysAgo: 27, bedHour: 0, bedMinute: 10, latencyMinutes: 35, wakeHour: 8, wakeMinute: 30, awakenings: 2, quality: 2, morningEnergy: 2, activity: "screen", notes: "追劇到很晚，隔天有點累" },
  { wakeDaysAgo: 26, bedHour: 23, bedMinute: 40, latencyMinutes: 20, wakeHour: 7, wakeMinute: 15, awakenings: 1, quality: 3, morningEnergy: 3, activity: "work" },
  // 25~23 天前無紀錄（出差、忘記記錄）
  { wakeDaysAgo: 22, bedHour: 23, bedMinute: 0, latencyMinutes: 10, wakeHour: 6, wakeMinute: 45, awakenings: 0, quality: 5, morningEnergy: 5, activity: "exercise", notes: "傍晚運動後很好入睡" },
  { wakeDaysAgo: 21, bedHour: 23, bedMinute: 30, latencyMinutes: 15, wakeHour: 7, wakeMinute: 0, awakenings: 0, quality: 4, morningEnergy: 4, activity: "meditation" },
  { wakeDaysAgo: 20, bedHour: 0, bedMinute: 30, latencyMinutes: 40, wakeHour: 8, wakeMinute: 0, awakenings: 1, quality: 3, morningEnergy: 3, activity: "caffeine", notes: "下午喝了拿鐵，入睡比平常久" },
  { wakeDaysAgo: 18, bedHour: 23, bedMinute: 15, latencyMinutes: 10, wakeHour: 6, wakeMinute: 50, awakenings: 0, quality: 4, morningEnergy: 4, activity: "reading" },
  { wakeDaysAgo: 17, bedHour: 23, bedMinute: 50, latencyMinutes: 25, wakeHour: 7, wakeMinute: 10, awakenings: 1, quality: 3, morningEnergy: 3, activity: "work", notes: "加班到比較晚" },
  { wakeDaysAgo: 15, bedHour: 22, bedMinute: 50, latencyMinutes: 10, wakeHour: 6, wakeMinute: 30, awakenings: 0, quality: 5, morningEnergy: 5, activity: "exercise", notes: "運動日，睡得特別沉" },
  { wakeDaysAgo: 14, bedHour: 23, bedMinute: 10, latencyMinutes: 15, wakeHour: 7, wakeMinute: 0, awakenings: 0, quality: 4, morningEnergy: 4, activity: "none" },
  { wakeDaysAgo: 13, bedHour: 1, bedMinute: 0, latencyMinutes: 30, wakeHour: 9, wakeMinute: 0, awakenings: 2, quality: 2, morningEnergy: 2, activity: "alcohol", notes: "朋友聚餐喝了點酒，半夜醒來兩次" },
  { wakeDaysAgo: 11, bedHour: 23, bedMinute: 0, latencyMinutes: 12, wakeHour: 6, wakeMinute: 40, awakenings: 0, quality: 4, morningEnergy: 4, activity: "meditation" },
  { wakeDaysAgo: 10, bedHour: 23, bedMinute: 25, latencyMinutes: 18, wakeHour: 7, wakeMinute: 5, awakenings: 1, quality: 3, morningEnergy: 3, activity: "screen" },
  { wakeDaysAgo: 8, bedHour: 22, bedMinute: 45, latencyMinutes: 10, wakeHour: 6, wakeMinute: 20, awakenings: 0, quality: 5, morningEnergy: 5, activity: "exercise", notes: "健身房訓練後很快入睡" },
  { wakeDaysAgo: 7, bedHour: 23, bedMinute: 20, latencyMinutes: 15, wakeHour: 7, wakeMinute: 0, awakenings: 0, quality: 4, morningEnergy: 4, activity: "reading" },
  { wakeDaysAgo: 6, bedHour: 0, bedMinute: 20, latencyMinutes: 30, wakeHour: 8, wakeMinute: 15, awakenings: 1, quality: 3, morningEnergy: 3, activity: "work", notes: "專案截止日前趕工" },
  { wakeDaysAgo: 5, bedHour: 23, bedMinute: 5, latencyMinutes: 10, wakeHour: 6, wakeMinute: 45, awakenings: 0, quality: 4, morningEnergy: 4, activity: "meditation" },
  { wakeDaysAgo: 4, bedHour: 23, bedMinute: 30, latencyMinutes: 20, wakeHour: 7, wakeMinute: 10, awakenings: 1, quality: 3, morningEnergy: 3, activity: "meal", notes: "宵夜吃得比較晚" },
  { wakeDaysAgo: 3, bedHour: 22, bedMinute: 40, latencyMinutes: 8, wakeHour: 6, wakeMinute: 15, awakenings: 0, quality: 5, morningEnergy: 5, activity: "exercise", notes: "運動日" },
  { wakeDaysAgo: 2, bedHour: 23, bedMinute: 15, latencyMinutes: 15, wakeHour: 7, wakeMinute: 0, awakenings: 0, quality: 4, morningEnergy: 4, activity: "reading" },
  { wakeDaysAgo: 1, bedHour: 23, bedMinute: 50, latencyMinutes: 30, wakeHour: 7, wakeMinute: 30, awakenings: 2, quality: 2, morningEnergy: 2, activity: "screen", notes: "睡前一直滑手機，入睡困難" },
  { wakeDaysAgo: 0, bedHour: 23, bedMinute: 10, latencyMinutes: 12, wakeHour: 6, wakeMinute: 50, awakenings: 0, quality: 4, morningEnergy: 4, activity: "meditation" },
];

export function seedSleepLogs(): SleepLog[] {
  const now = nowIso();

  return PLAN.map((entry) => {
    const date = isoDateDaysAgo(entry.wakeDaysAgo);
    // 上床日：若時間落在傍晚（>=12 點），代表上床發生在起床日的前一晚；
    // 若時間落在凌晨（<12 點），代表上床本身就已跨過午夜、與起床同一曆日。
    const bedDaysAgo = entry.bedHour >= 12 ? entry.wakeDaysAgo + 1 : entry.wakeDaysAgo;
    const bedDate = isoDateDaysAgo(bedDaysAgo);

    const bedtime = atTime(bedDate, entry.bedHour, entry.bedMinute);
    const sleepAt = new Date(bedtime.getTime() + entry.latencyMinutes * 60_000);
    const wakeAt = atTime(date, entry.wakeHour, entry.wakeMinute);

    const bedtimeIso = bedtime.toISOString();
    const sleepAtIso = sleepAt.toISOString();
    const wakeAtIso = wakeAt.toISOString();

    const record: SleepLog = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      date,
      bedtime: bedtimeIso,
      sleepAt: sleepAtIso,
      wakeAt: wakeAtIso,
      hours: computeHours(sleepAtIso, wakeAtIso),
      awakenings: entry.awakenings,
      quality: entry.quality,
      morningEnergy: entry.morningEnergy,
      preSleepActivity: entry.activity,
      notes: entry.notes,
    };
    return record;
  });
}
