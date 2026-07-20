/**
 * features/timeline/normalize.ts — 將各資料表原始紀錄轉換為統一的 TimelineEntry。
 */

import { formatDateShort, formatTime, isoDateOnly } from "./date-utils";
import {
  APPOINTMENT_STATUS_LABEL,
  ACTIVITY_SOURCE_LABEL,
  type Activity,
  type Appointment,
  type HealthDocument,
  type ReadBodyMetric,
  type ReadMealLog,
  type ReadMedication,
  type ReadMedicationLog,
  type ReadNote,
  type ReadRehabSession,
  type ReadSleepLog,
  type ReadSymptomLog,
  type ReadWorkout,
} from "./schema";
import type { TimelineEntry } from "./types";

export function fromAppointment(a: Appointment): TimelineEntry {
  return {
    id: `appointment:${a.id}`,
    kind: "appointment",
    date: isoDateOnly(a.startAt),
    at: a.startAt,
    title: `回診：${a.department ?? a.reason ?? "門診"}`,
    subtitle: [a.doctor, a.location].filter(Boolean).join(" · "),
    meta: [APPOINTMENT_STATUS_LABEL[a.status], formatTime(a.startAt)].filter(Boolean) as string[],
    notes: a.notes,
    editable: true,
    recordId: a.id,
    detail: a.reason,
  };
}

export function fromDocument(d: HealthDocument): TimelineEntry {
  return {
    id: `document:${d.id}`,
    kind: "document",
    date: d.date,
    at: `${d.date}T12:00:00`,
    title: d.title,
    subtitle: [d.category, d.provider].filter(Boolean).join(" · "),
    meta: [d.category, d.fileName ? "含附件" : "無附件"],
    notes: d.notes,
    editable: true,
    recordId: d.id,
    detail: d.fileName,
  };
}

export function fromActivity(a: Activity): TimelineEntry {
  const parts: string[] = [];
  if (a.steps !== undefined) parts.push(`${a.steps.toLocaleString("zh-TW")} 步`);
  if (a.activeMin !== undefined) parts.push(`活動 ${a.activeMin} 分`);
  if (a.distanceKm !== undefined) parts.push(`${a.distanceKm} 公里`);
  return {
    id: `exercise:activity:${a.id}`,
    kind: "exercise",
    date: a.date,
    at: a.occurredAt,
    title: `日活動量（${ACTIVITY_SOURCE_LABEL[a.source]}）`,
    subtitle: a.isPrimary ? undefined : "非主要來源，未計入每日彙總",
    meta: parts,
    notes: a.notes,
    editable: true,
    recordId: a.id,
    detail: ACTIVITY_SOURCE_LABEL[a.source],
  };
}

export function fromWorkout(w: ReadWorkout): TimelineEntry {
  return {
    id: `exercise:workout:${w.id}`,
    kind: "exercise",
    date: w.date,
    at: `${w.date}T18:00:00`,
    title: `運動：${w.type}`,
    meta: [`${w.durationMinutes} 分鐘`, w.caloriesBurned ? `${w.caloriesBurned} 大卡` : undefined].filter(
      Boolean,
    ) as string[],
    notes: w.notes,
    editable: false,
    recordId: w.id,
  };
}

export function fromRehabSession(r: ReadRehabSession): TimelineEntry {
  const meta: string[] = [];
  if (r.durationMin !== undefined) meta.push(`${r.durationMin} 分鐘`);
  if (r.painLevelBefore !== undefined && r.painLevelAfter !== undefined) {
    meta.push(`疼痛 ${r.painLevelBefore} → ${r.painLevelAfter}`);
  }
  return {
    id: `rehab:${r.id}`,
    kind: "rehab",
    date: r.date,
    at: `${r.date}T11:00:00`,
    title: `復健：${r.exerciseSummary}`,
    meta,
    notes: r.notes,
    editable: false,
    recordId: r.id,
  };
}

export function fromBodyMetric(b: ReadBodyMetric): TimelineEntry {
  return {
    id: `weight:${b.id}`,
    kind: "weight",
    date: b.date,
    at: `${b.date}T08:00:00`,
    title: `體重 ${b.weightKg.toFixed(1)} 公斤`,
    meta: [],
    notes: b.note,
    editable: false,
    recordId: b.id,
  };
}

export function fromSleepLog(s: ReadSleepLog): TimelineEntry {
  return {
    id: `sleep:${s.id}`,
    kind: "sleep",
    date: s.date,
    at: `${s.date}T07:00:00`,
    title: `睡眠 ${s.hours.toFixed(1)} 小時`,
    meta: [`品質 ${s.quality}/5`],
    notes: s.notes,
    editable: false,
    recordId: s.id,
  };
}

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
  supplement: "保健品",
};

export function fromMealLog(m: ReadMealLog): TimelineEntry {
  return {
    id: `diet:${m.id}`,
    kind: "diet",
    date: m.date,
    at: m.loggedAt,
    title: `飲食：${MEAL_TYPE_LABEL[m.type] ?? m.type}`,
    subtitle: m.text,
    meta: m.calories ? [`${m.calories} 大卡`] : [],
    notes: m.notes,
    editable: false,
    recordId: m.id,
  };
}

export function fromSymptomLog(s: ReadSymptomLog): TimelineEntry {
  return {
    id: `symptom:${s.id}`,
    kind: "symptom",
    date: s.date,
    at: s.startAt,
    title: `症狀：${s.symptomLabel ?? "未命名症狀"}`,
    subtitle: s.bodyLocation,
    meta: [`強度 ${s.intensity}/10`, s.durationMin ? `持續 ${s.durationMin} 分鐘` : undefined].filter(
      Boolean,
    ) as string[],
    notes: s.notes,
    editable: false,
    recordId: s.id,
  };
}

const MED_STATUS_LABEL: Record<string, string> = { taken: "已服用", missed: "漏服", skipped: "主動略過" };

export function fromMedicationLog(m: ReadMedicationLog, medicationName: string | undefined): TimelineEntry {
  return {
    id: `medication:${m.id}`,
    kind: "medication",
    date: isoDateOnly(m.scheduledFor),
    at: m.takenAt ?? m.scheduledFor,
    title: `用藥：${medicationName ?? "未知藥物"}`,
    meta: [MED_STATUS_LABEL[m.status] ?? m.status, formatTime(m.scheduledFor)],
    notes: m.note,
    editable: false,
    recordId: m.id,
  };
}

export function fromNote(n: ReadNote): TimelineEntry {
  const date = isoDateOnly(n.createdAt);
  return {
    id: `note:${n.id}`,
    kind: "note",
    date,
    at: n.createdAt,
    title: n.title || "（無標題筆記）",
    subtitle: n.folder || undefined,
    meta: n.tags,
    notes: n.content.slice(0, 200),
    editable: false,
    recordId: n.id,
  };
}

export function buildMedicationNameMap(medications: ReadMedication[]): Map<string, string> {
  return new Map(medications.map((m) => [m.id, m.name]));
}

export { formatDateShort };
