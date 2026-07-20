/**
 * features/body/constants.ts — 靜態設定值（快速按鈕、常用容器預設值、量測欄位定義）。
 */

export const WATER_QUICK_AMOUNTS = [250, 350, 500] as const;

export const DEFAULT_WATER_GOAL_ML = 2000;

export interface WaterContainer {
  id: string;
  label: string;
  amountMl: number;
}

export const DEFAULT_WATER_CONTAINERS: WaterContainer[] = [
  { id: "cup", label: "馬克杯", amountMl: 250 },
  { id: "tumbler", label: "隨行杯", amountMl: 350 },
  { id: "bottle", label: "水瓶", amountMl: 500 },
  { id: "sports-bottle", label: "運動水壺", amountMl: 700 },
];

export interface MetricFieldDef {
  key:
    | "weightKg"
    | "bodyFatPercent"
    | "muscleMassKg"
    | "skeletalMuscleKg"
    | "visceralFatLevel"
    | "waistCm"
    | "chestCm"
    | "hipCm"
    | "armCm"
    | "thighCm"
    | "calfCm"
    | "restingHeartRate"
    | "bloodPressureSystolic"
    | "bloodPressureDiastolic"
    | "spo2Percent"
    | "bodyTempCelsius";
  label: string;
  unit: string;
  step: number;
  required?: boolean;
  group: "體組成" | "圍度" | "生理徵象";
}

export const BODY_METRIC_FIELDS: MetricFieldDef[] = [
  { key: "weightKg", label: "體重", unit: "kg", step: 0.1, required: true, group: "體組成" },
  { key: "bodyFatPercent", label: "體脂率", unit: "%", step: 0.1, group: "體組成" },
  { key: "muscleMassKg", label: "肌肉量", unit: "kg", step: 0.1, group: "體組成" },
  { key: "skeletalMuscleKg", label: "骨骼肌量", unit: "kg", step: 0.1, group: "體組成" },
  { key: "visceralFatLevel", label: "內臟脂肪指數", unit: "級", step: 1, group: "體組成" },
  { key: "waistCm", label: "腰圍", unit: "cm", step: 0.5, group: "圍度" },
  { key: "chestCm", label: "胸圍", unit: "cm", step: 0.5, group: "圍度" },
  { key: "hipCm", label: "臀圍", unit: "cm", step: 0.5, group: "圍度" },
  { key: "armCm", label: "手臂圍", unit: "cm", step: 0.5, group: "圍度" },
  { key: "thighCm", label: "大腿圍", unit: "cm", step: 0.5, group: "圍度" },
  { key: "calfCm", label: "小腿圍", unit: "cm", step: 0.5, group: "圍度" },
  { key: "restingHeartRate", label: "靜息心率", unit: "bpm", step: 1, group: "生理徵象" },
  { key: "bloodPressureSystolic", label: "血壓（收縮壓）", unit: "mmHg", step: 1, group: "生理徵象" },
  { key: "bloodPressureDiastolic", label: "血壓（舒張壓）", unit: "mmHg", step: 1, group: "生理徵象" },
  { key: "spo2Percent", label: "血氧濃度", unit: "%", step: 1, group: "生理徵象" },
  { key: "bodyTempCelsius", label: "體溫", unit: "°C", step: 0.1, group: "生理徵象" },
];

export const METRIC_RANGE_OPTIONS = [
  { value: "30", label: "近 30 天" },
  { value: "90", label: "近 90 天" },
  { value: "all", label: "全部" },
];

export const WATER_STORAGE_KEY = "dailyos-body-water-prefs-v1";
