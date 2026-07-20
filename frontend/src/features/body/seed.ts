/**
 * features/body/seed.ts — 試用模式種子資料。
 * 逼真的繁體中文使用情境：近 30 天，量測非每日進行（模擬真實使用頻率，
 * 同時刻意製造資料缺口以驗證圖表的缺口標示）。
 */

import { newId, nowIso } from "@/lib/resource";
import type { BodyMetric, WaterLog } from "./schema";

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function loggedAtFor(dateIso: string, hour: number, minute: number): string {
  return new Date(`${dateIso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`).toISOString();
}

export function seedBodyMetrics(): BodyMetric[] {
  const now = nowIso();
  // 量測日：距今天數（非等距，模擬真實使用者不會每天量體重）
  const daysAgoList = [28, 25, 21, 18, 14, 11, 7, 5, 3, 1, 0];
  const weights = [70.8, 70.4, 70.6, 70.1, 69.8, 69.9, 69.5, 69.3, 69.0, 68.8, 68.6];
  const bodyFats = [24.1, 23.9, 23.8, 23.5, 23.4, 23.2, 23.0, 22.8, undefined, 22.6, 22.4];
  const waists = [84.5, 84.2, 84.0, undefined, 83.4, 83.2, 83.0, undefined, 82.5, 82.3, 82.0];

  return daysAgoList.map((daysAgo, index) => {
    const date = isoDateDaysAgo(daysAgo);
    const weight = weights[index] ?? 70;
    const bodyFat = bodyFats[index];
    const waist = waists[index];
    const record: BodyMetric = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      date,
      loggedAt: loggedAtFor(date, 7, 30),
      weightKg: weight,
      bodyFatPercent: bodyFat,
      muscleMassKg: index % 2 === 0 ? Number((weight * 0.42).toFixed(1)) : undefined,
      skeletalMuscleKg: undefined,
      visceralFatLevel: index % 3 === 0 ? 8 : undefined,
      waistCm: waist,
      chestCm: undefined,
      hipCm: undefined,
      armCm: undefined,
      thighCm: undefined,
      calfCm: undefined,
      restingHeartRate: index % 2 === 0 ? 62 + (index % 4) : undefined,
      bloodPressureSystolic: index === daysAgoList.length - 1 ? 118 : undefined,
      bloodPressureDiastolic: index === daysAgoList.length - 1 ? 76 : undefined,
      spo2Percent: index === 4 ? 98 : undefined,
      bodyTempCelsius: undefined,
      customMetrics: index === daysAgoList.length - 1 ? [{ id: newId(), label: "空腹血糖", value: 92, unit: "mg/dL" }] : undefined,
      note: index === 0 ? "健檢當天量測，早上空腹" : undefined,
      source: "manual",
    };
    return record;
  });
}

export function seedWaterLogs(): WaterLog[] {
  const now = nowIso();
  // 刻意跳過部分日期（例如出差、忘記記錄），示範資料缺口
  const plan: Array<{ daysAgo: number; entries: Array<{ hour: number; minute: number; amountMl: number; container?: string }> }> = [
    { daysAgo: 12, entries: [{ hour: 8, minute: 10, amountMl: 350, container: "隨行杯" }, { hour: 14, minute: 30, amountMl: 500, container: "水瓶" }] },
    { daysAgo: 11, entries: [{ hour: 8, minute: 0, amountMl: 250, container: "馬克杯" }, { hour: 13, minute: 20, amountMl: 500, container: "水瓶" }] },
    // 10~9 天前無紀錄（缺口）
    { daysAgo: 8, entries: [{ hour: 9, minute: 15, amountMl: 350, container: "隨行杯" }] },
    { daysAgo: 6, entries: [{ hour: 7, minute: 45, amountMl: 250, container: "馬克杯" }, { hour: 12, minute: 0, amountMl: 350, container: "隨行杯" }] },
    { daysAgo: 5, entries: [{ hour: 8, minute: 30, amountMl: 500, container: "水瓶" }] },
    { daysAgo: 3, entries: [{ hour: 9, minute: 0, amountMl: 350, container: "隨行杯" }] },
    { daysAgo: 2, entries: [{ hour: 8, minute: 20, amountMl: 250, container: "馬克杯" }, { hour: 11, minute: 10, amountMl: 700, container: "運動水壺" }] },
    { daysAgo: 1, entries: [{ hour: 7, minute: 50, amountMl: 350, container: "隨行杯" }, { hour: 13, minute: 0, amountMl: 500, container: "水瓶" }] },
    { daysAgo: 0, entries: [{ hour: 8, minute: 5, amountMl: 350, container: "隨行杯" }] },
  ];

  const rows: WaterLog[] = [];
  for (const day of plan) {
    const date = isoDateDaysAgo(day.daysAgo);
    for (const entry of day.entries) {
      rows.push({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        version: 1,
        deleted: false,
        date,
        loggedAt: loggedAtFor(date, entry.hour, entry.minute),
        amountMl: entry.amountMl,
        containerLabel: entry.container,
        note: undefined,
        source: "manual",
      });
    }
  }
  return rows;
}
