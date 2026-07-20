/**
 * features/meds/repo.ts — medications / supplements / medication_schedules / medication_logs
 * 的 createResource 定義。唯一的資料存取入口；元件一律透過這裡匯出的 repo 存取資料。
 */

import { createResource, type ActionsMap } from "@/lib/resource";
import { seedMedicationLogs, seedMedicationSchedules, seedMedications, seedSupplements } from "./seed";
import {
  medicationLogSchema,
  medicationScheduleSchema,
  medicationSchema,
  supplementSchema,
  type Medication,
  type MedicationLog,
  type MedicationSchedule,
  type Supplement,
} from "./types";

/**
 * 啟用／停用 action：停用不刪除歷史紀錄，只是從主要清單淡出，也停止補貨提醒。
 * 明確標註 `satisfies ActionsMap<Medication>` 並在 createResource 的第二個型別參數帶入
 * `typeof medicationActions`，避免 TS 在只提供第一個型別參數時退回預設的 `ActionsMap<T>`
 * （index signature），導致 `actions.toggleActive` 被推斷為可能 `undefined`。
 */
const medicationActions = {
  toggleActive: {
    httpAction: "toggle-active",
    trial: (record: Medication) => ({ active: !record.active }),
  },
} satisfies ActionsMap<Medication>;

export const medicationsRepo = createResource<Medication, typeof medicationActions>({
  name: "medications",
  schema: medicationSchema,
  seed: seedMedications,
  actions: medicationActions,
});

const supplementActions = {
  toggleActive: {
    httpAction: "toggle-active",
    trial: (record: Supplement) => ({ active: !record.active }),
  },
} satisfies ActionsMap<Supplement>;

export const supplementsRepo = createResource<Supplement, typeof supplementActions>({
  name: "supplements",
  schema: supplementSchema,
  seed: seedSupplements,
  actions: supplementActions,
});

export const medicationSchedulesRepo = createResource<MedicationSchedule>({
  name: "medication_schedules",
  schema: medicationScheduleSchema,
  seed: seedMedicationSchedules,
});

export const medicationLogsRepo = createResource<MedicationLog>({
  name: "medication_logs",
  schema: medicationLogSchema,
  seed: seedMedicationLogs,
});
