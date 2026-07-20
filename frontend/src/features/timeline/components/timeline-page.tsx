"use client";

/**
 * timeline-page.tsx — 「健康時間線」主頁面。
 *
 * 彙整症狀／運動／復健／體重／睡眠／飲食／用藥／回診／文件／備註等健康資料表，
 * 提供依日期／類型篩選、關鍵字搜尋、CSV 匯出，以及回診摘要。
 * 本模組擁有（可新增/編輯/刪除）：health_documents、appointments、activities；
 * 其餘來源僅供顯示（唯讀彙整）。
 */

import { useMemo, useState } from "react";

import { ErrorState, OfflineState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useOnlineStatus } from "@/components/pwa/use-online-status";
import { isAuth } from "@/lib/mode";

import {
  buildMedicationNameMap,
  fromAppointment,
  fromActivity,
  fromBodyMetric,
  fromDocument,
  fromMealLog,
  fromMedicationLog,
  fromNote,
  fromRehabSession,
  fromSleepLog,
  fromSymptomLog,
  fromWorkout,
} from "../normalize";
import {
  activitiesResource,
  appointmentsResource,
  bodyMetricsReadResource,
  healthDocumentsResource,
  mealLogsReadResource,
  medicationLogsReadResource,
  medicationsReadResource,
  notesReadResource,
  rehabSessionsReadResource,
  sleepLogsReadResource,
  symptomLogsReadResource,
  workoutsReadResource,
} from "../resources";
import type { Activity, Appointment, HealthDocument } from "../schema";
import { DEFAULT_FILTERS, type TimelineEntry, type TimelineFilters } from "../types";
import {
  defaultExportFilename,
  downloadTextFile,
  exportEntriesToCsv,
  filterEntries,
  groupActivitiesByDate,
  summarizeAppointments,
} from "../utils";
import { ActivityFormSheet } from "./activity-form-sheet";
import { AppointmentFormSheet } from "./appointment-form-sheet";
import { AppointmentSummaryPanel } from "./appointment-summary-panel";
import { DocumentFormSheet } from "./document-form-sheet";
import { FilterBar } from "./filter-bar";
import { TimelineList } from "./timeline-list";
import { UndoBanner } from "./undo-banner";

type PendingDelete =
  | { kind: "appointment"; record: Appointment }
  | { kind: "document"; record: HealthDocument }
  | { kind: "exercise-activity"; record: Activity };

export function TimelinePage() {
  const online = useOnlineStatus();
  const offlineBlocked = isAuth() && !online;

  const documentsQuery = healthDocumentsResource.useList({ ordering: "-date", pageSize: 200 });
  const appointmentsQuery = appointmentsResource.useList({ ordering: "-startAt", pageSize: 200 });
  const activitiesQuery = activitiesResource.useList({ ordering: "-date", pageSize: 200 });

  const symptomLogsQuery = symptomLogsReadResource.useList({ pageSize: 200 });
  const workoutsQuery = workoutsReadResource.useList({ pageSize: 200 });
  const rehabSessionsQuery = rehabSessionsReadResource.useList({ pageSize: 200 });
  const bodyMetricsQuery = bodyMetricsReadResource.useList({ pageSize: 200 });
  const sleepLogsQuery = sleepLogsReadResource.useList({ pageSize: 200 });
  const mealLogsQuery = mealLogsReadResource.useList({ pageSize: 200 });
  const medicationsQuery = medicationsReadResource.useList({ pageSize: 200 });
  const medicationLogsQuery = medicationLogsReadResource.useList({ pageSize: 200 });
  const notesQuery = notesReadResource.useList({ pageSize: 200 });

  const [filters, setFilters] = useState<TimelineFilters>(DEFAULT_FILTERS);
  const [appointmentSheet, setAppointmentSheet] = useState<{ open: boolean; editing?: Appointment | null }>({ open: false });
  const [documentSheet, setDocumentSheet] = useState<{ open: boolean; editing?: HealthDocument | null }>({ open: false });
  const [activitySheet, setActivitySheet] = useState<{ open: boolean; editing?: Activity | null }>({ open: false });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const removeAppointment = appointmentsResource.useRemove();
  const updateAppointment = appointmentsResource.useUpdate();
  const removeDocument = healthDocumentsResource.useRemove();
  const updateDocument = healthDocumentsResource.useUpdate();
  const removeActivity = activitiesResource.useRemove();
  const updateActivity = activitiesResource.useUpdate();

  const ownedLoading = documentsQuery.isLoading || appointmentsQuery.isLoading || activitiesQuery.isLoading;
  const ownedError = documentsQuery.isError || appointmentsQuery.isError || activitiesQuery.isError;

  const appointments = useMemo(() => appointmentsQuery.data?.results ?? [], [appointmentsQuery.data]);
  const documents = useMemo(() => documentsQuery.data?.results ?? [], [documentsQuery.data]);
  const activities = useMemo(() => activitiesQuery.data?.results ?? [], [activitiesQuery.data]);
  const medicationNameMap = useMemo(
    () => buildMedicationNameMap(medicationsQuery.data?.results ?? []),
    [medicationsQuery.data],
  );

  const entries: TimelineEntry[] = useMemo(() => {
    const list: TimelineEntry[] = [];
    for (const a of appointments) list.push(fromAppointment(a));
    for (const d of documents) list.push(fromDocument(d));
    for (const a of activities) list.push(fromActivity(a));
    for (const s of symptomLogsQuery.data?.results ?? []) list.push(fromSymptomLog(s));
    for (const w of workoutsQuery.data?.results ?? []) list.push(fromWorkout(w));
    for (const r of rehabSessionsQuery.data?.results ?? []) list.push(fromRehabSession(r));
    for (const b of bodyMetricsQuery.data?.results ?? []) list.push(fromBodyMetric(b));
    for (const s of sleepLogsQuery.data?.results ?? []) list.push(fromSleepLog(s));
    for (const m of mealLogsQuery.data?.results ?? []) list.push(fromMealLog(m));
    for (const m of medicationLogsQuery.data?.results ?? []) list.push(fromMedicationLog(m, medicationNameMap.get(m.medicationId)));
    for (const n of notesQuery.data?.results ?? []) {
      if (n.folder.includes("健康") || n.tags.some((t) => t.includes("健康"))) list.push(fromNote(n));
    }
    return list;
  }, [
    appointments,
    documents,
    activities,
    symptomLogsQuery.data,
    workoutsQuery.data,
    rehabSessionsQuery.data,
    bodyMetricsQuery.data,
    sleepLogsQuery.data,
    mealLogsQuery.data,
    medicationLogsQuery.data,
    medicationNameMap,
    notesQuery.data,
  ]);

  const filtered = useMemo(() => filterEntries(entries, filters), [entries, filters]);
  const appointmentSummary = useMemo(() => summarizeAppointments(appointments), [appointments]);
  const multiSourceActivityDays = useMemo(
    () => groupActivitiesByDate(activities).filter((g) => g.hasMultipleSources),
    [activities],
  );

  function handleEdit(entry: TimelineEntry) {
    if (entry.kind === "appointment") {
      const record = appointments.find((a) => a.id === entry.recordId);
      if (record) setAppointmentSheet({ open: true, editing: record });
    } else if (entry.kind === "document") {
      const record = documents.find((d) => d.id === entry.recordId);
      if (record) setDocumentSheet({ open: true, editing: record });
    } else if (entry.kind === "exercise" && entry.id.startsWith("exercise:activity:")) {
      const record = activities.find((a) => a.id === entry.recordId);
      if (record) setActivitySheet({ open: true, editing: record });
    }
  }

  async function handleDelete(entry: TimelineEntry) {
    try {
      if (entry.kind === "appointment") {
        const record = appointments.find((a) => a.id === entry.recordId);
        if (!record) return;
        await removeAppointment.mutateAsync(record.id);
        setPendingDelete({ kind: "appointment", record });
        toast.info("已刪除回診紀錄");
      } else if (entry.kind === "document") {
        const record = documents.find((d) => d.id === entry.recordId);
        if (!record) return;
        await removeDocument.mutateAsync(record.id);
        setPendingDelete({ kind: "document", record });
        toast.info("已刪除文件");
      } else if (entry.kind === "exercise" && entry.id.startsWith("exercise:activity:")) {
        const record = activities.find((a) => a.id === entry.recordId);
        if (!record) return;
        await removeActivity.mutateAsync(record.id);
        setPendingDelete({ kind: "exercise-activity", record });
        toast.info("已刪除活動紀錄");
      }
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  async function handleUndo() {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.kind === "appointment") {
        await updateAppointment.mutateAsync({ id: pendingDelete.record.id, patch: { deleted: false } });
      } else if (pendingDelete.kind === "document") {
        await updateDocument.mutateAsync({ id: pendingDelete.record.id, patch: { deleted: false } });
      } else {
        await updateActivity.mutateAsync({ id: pendingDelete.record.id, patch: { deleted: false } });
      }
      toast.success("已復原");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    } finally {
      setPendingDelete(null);
    }
  }

  function handleExport() {
    downloadTextFile(defaultExportFilename(), exportEntriesToCsv(filtered));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-ink">健康時間線</h1>
          <p className="text-caption text-ink-muted">
            彙整症狀、運動、復健、體重、睡眠、飲食、用藥、回診、文件與備註，掌握健康全貌。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setActivitySheet({ open: true, editing: null })}>
            + 新增活動
          </Button>
          <Button type="button" variant="secondary" onClick={() => setDocumentSheet({ open: true, editing: null })}>
            + 新增文件
          </Button>
          <Button type="button" onClick={() => setAppointmentSheet({ open: true, editing: null })}>
            + 新增回診
          </Button>
        </div>
      </header>

      {offlineBlocked ? (
        <OfflineState />
      ) : ownedLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : ownedError ? (
        <ErrorState
          description="健康時間線資料載入失敗，請檢查連線後重試。"
          onRetry={() => {
            documentsQuery.refetch();
            appointmentsQuery.refetch();
            activitiesQuery.refetch();
          }}
        />
      ) : (
        <>
          <AppointmentSummaryPanel summary={appointmentSummary} />

          {multiSourceActivityDays.length > 0 ? (
            <p role="status" className="rounded-md border border-warning-soft bg-warning-soft/40 px-4 py-2.5 text-caption text-ink-soft">
              有 {multiSourceActivityDays.length} 天存在多個來源的活動紀錄（
              {multiSourceActivityDays.map((g) => g.date.slice(5)).join("、")}
              ）。系統不會自動加總不同來源的數字，僅以標示「主要來源」的紀錄呈現彙總，請於下方時間線分別檢視各筆來源。
            </p>
          ) : null}

          {pendingDelete ? (
            <UndoBanner
              message="已刪除一筆紀錄"
              onUndo={handleUndo}
              onDismiss={() => setPendingDelete(null)}
            />
          ) : null}

          <FilterBar filters={filters} onChange={setFilters} onExport={handleExport} exportDisabled={filtered.length === 0} />

          <TimelineList entries={filtered} onEdit={handleEdit} onDelete={handleDelete} />
        </>
      )}

      <AppointmentFormSheet
        open={appointmentSheet.open}
        onClose={() => setAppointmentSheet({ open: false })}
        editing={appointmentSheet.editing}
      />
      <DocumentFormSheet
        open={documentSheet.open}
        onClose={() => setDocumentSheet({ open: false })}
        editing={documentSheet.editing}
      />
      <ActivityFormSheet
        open={activitySheet.open}
        onClose={() => setActivitySheet({ open: false })}
        editing={activitySheet.editing}
        existing={activities}
      />
    </div>
  );
}
