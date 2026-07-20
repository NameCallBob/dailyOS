/**
 * features/timeline/resources.ts — 本模組的 createResource 綁定。
 *
 * health_documents / appointments / activities：本模組擁有，完整 CRUD + seed。
 * 其餘（symptom_logs / workouts / rehab_sessions / body_metrics / sleep_logs /
 * meal_logs / medications / medication_logs / notes）：唯讀彙整，本模組不呼叫
 * 對應 repo 的 create/update/remove，也一律不提供 seed —— 這些資料表已由對應模組
 * （body／sleep／nutrition／notes／symptoms／workouts／rehab／meds）建置完成並各自
 * seed。若本模組也提供一份 seed，會與擁有模組的 schema／欄位形狀不一致；而
 * lib/resource.ts 的 lazy-seed 是「哪個模組先讀到空表就用哪份 seed」，兩份不同
 * 形狀的 seed 互相競爭會讓其中一個模組讀到壞資料而整頁壞掉。
 * （symptom_logs／workouts／rehab_sessions／medications／medication_logs 原本
 * 因為對應模組尚未建置頁面而由本模組提供 lazy-seed，現在對應模組都已建置，
 * 故不再由本模組提供 seed；若在對應模組頁面之前先造訪時間線，這些彙整區塊
 * 會先顯示「尚無資料」，待造訪對應模組頁面觸發 seed 後才會顯示。）
 */

import { createResource } from "@/lib/resource";

import {
  activitySchema,
  appointmentSchema,
  healthDocumentSchema,
  readBodyMetricSchema,
  readMealLogSchema,
  readMedicationLogSchema,
  readMedicationSchema,
  readNoteSchema,
  readRehabSessionSchema,
  readSleepLogSchema,
  readSymptomLogSchema,
  readWorkoutSchema,
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
import { seedActivities, seedAppointments, seedHealthDocuments } from "./seed";

// ---------------------------------------------------------------------------
// 本模組擁有（完整 CRUD）
// ---------------------------------------------------------------------------

export const healthDocumentsResource = createResource<HealthDocument>({
  name: "health_documents",
  schema: healthDocumentSchema,
  seed: seedHealthDocuments,
});

export const appointmentsResource = createResource<Appointment>({
  name: "appointments",
  schema: appointmentSchema,
  seed: seedAppointments,
});

export const activitiesResource = createResource<Activity>({
  name: "activities",
  schema: activitySchema,
  seed: seedActivities,
});

// ---------------------------------------------------------------------------
// 唯讀彙整：已有其他模組建置並 seed，不重複提供 seed
// ---------------------------------------------------------------------------

export const bodyMetricsReadResource = createResource<ReadBodyMetric>({
  name: "body_metrics",
  schema: readBodyMetricSchema,
});

export const sleepLogsReadResource = createResource<ReadSleepLog>({
  name: "sleep_logs",
  schema: readSleepLogSchema,
});

export const mealLogsReadResource = createResource<ReadMealLog>({
  name: "meal_logs",
  schema: readMealLogSchema,
});

export const notesReadResource = createResource<ReadNote>({
  name: "notes",
  schema: readNoteSchema,
});

// ---------------------------------------------------------------------------
// 唯讀彙整：對應模組現已建置完成並各自 seed，本模組不重複提供 seed
// ---------------------------------------------------------------------------

export const symptomLogsReadResource = createResource<ReadSymptomLog>({
  name: "symptom_logs",
  schema: readSymptomLogSchema,
});

export const workoutsReadResource = createResource<ReadWorkout>({
  name: "workouts",
  schema: readWorkoutSchema,
});

export const rehabSessionsReadResource = createResource<ReadRehabSession>({
  name: "rehab_sessions",
  schema: readRehabSessionSchema,
});

export const medicationsReadResource = createResource<ReadMedication>({
  name: "medications",
  schema: readMedicationSchema,
});

export const medicationLogsReadResource = createResource<ReadMedicationLog>({
  name: "medication_logs",
  schema: readMedicationLogSchema,
});
