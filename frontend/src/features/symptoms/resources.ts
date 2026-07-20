/**
 * features/symptoms/resources.ts — 本模組的 createResource 綁定。
 * symptom_defs / symptom_logs：完整 CRUD（試用走 Dexie + seed，登入走 /api/v1/{name}/）。
 */

import { createResource } from "@/lib/resource";

import { symptomDefSchema, symptomLogSchema, type SymptomDefinition, type SymptomLog } from "./schema";
import { seedSymptomDefs, seedSymptomLogs } from "./seed";

export const symptomDefsResource = createResource<SymptomDefinition>({
  name: "symptom_defs",
  schema: symptomDefSchema,
  seed: seedSymptomDefs,
});

export const symptomLogsResource = createResource<SymptomLog>({
  name: "symptom_logs",
  schema: symptomLogSchema,
  seed: seedSymptomLogs,
});
