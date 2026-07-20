/**
 * features/meds/format.ts — 顯示用格式化工具（純函式）。
 */

import { WEEKDAY_LABEL, type Medication } from "./types";

export function formatDoseWithUnit(item: Pick<Medication, "dose" | "unit">): string {
  const dose = Number.isInteger(item.dose) ? String(item.dose) : item.dose.toFixed(1);
  return `${dose}${item.unit}`;
}

export function formatFrequencySummary(item: Medication): string {
  switch (item.frequency) {
    case "daily":
      return item.times.length > 0 ? `每天 ${item.times.join("、")}` : "每天";
    case "specific-days": {
      const days = (item.daysOfWeek ?? []).slice().sort((a, b) => a - b);
      if (days.length === 0) return "每週（尚未選擇日子）";
      const dayLabel = days.map((d) => `週${WEEKDAY_LABEL[d]}`).join("、");
      return item.times.length > 0 ? `${dayLabel} ${item.times.join("、")}` : dayLabel;
    }
    case "every-n-days":
      return `每隔 ${item.intervalDays ?? 2} 天${item.times.length > 0 ? ` ${item.times.join("、")}` : ""}`;
    case "as-needed":
      return "需要時服用";
    default:
      return "";
  }
}

export function formatRemainingQty(item: Medication): string | null {
  if (item.remainingQty === undefined) return null;
  const qty = Number.isInteger(item.remainingQty) ? String(item.remainingQty) : item.remainingQty.toFixed(1);
  return `剩餘 ${qty}${item.unit}`;
}

export function needsRefill(item: Medication): boolean {
  if (!item.refillReminder?.enabled) return false;
  if (item.remainingQty === undefined) return false;
  return item.remainingQty <= item.refillReminder.thresholdQty;
}
