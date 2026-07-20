"use client";

/**
 * symptoms-page-client.tsx — 「症狀」模組主頁面組裝。
 * Loading / Error / Empty 四態齊備；快速紀錄放在最顯眼位置，
 * 部位／誘因／緩解等細節欄位一律選填，避免拖慢記錄速度。
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import { SYMPTOM_CATEGORIES } from "./constants";
import { SymptomDefFormSheet } from "./components/symptom-def-form-sheet";
import { SymptomDefManager } from "./components/symptom-def-manager";
import { SymptomLogCard } from "./components/symptom-log-card";
import { SymptomLogFormSheet } from "./components/symptom-log-form-sheet";
import { UndoBanner } from "./components/undo-banner";
import { useDeleteLogWithUndo, useRestoreLog } from "./hooks";
import { symptomDefsResource, symptomLogsResource } from "./resources";
import type { SymptomDefinition, SymptomLog } from "./schema";
import { useSymptomsUiStore } from "./store";
import { sortByStartAtDesc } from "./utils";

export function SymptomsPageClient() {
  const defsQuery = symptomDefsResource.useList({ ordering: "name", pageSize: 200 });
  const logsQuery = symptomLogsResource.useList({ ordering: "-startAt", pageSize: 200 });

  const {
    categoryFilter,
    symptomDefFilter,
    setCategoryFilter,
    setSymptomDefFilter,
    logFormOpen,
    editingLogId,
    prefillDefId,
    openCreateLog,
    openEditLog,
    closeLogForm,
    defManagerOpen,
    editingDefId,
    openCreateDef,
    openEditDef,
    closeDefForm,
    lastDeletedLog,
    setLastDeletedLog,
  } = useSymptomsUiStore();

  const { deleteLog } = useDeleteLogWithUndo();
  const restoreLog = useRestoreLog();

  const defs = useMemo(() => defsQuery.data?.results ?? [], [defsQuery.data]);
  const logs = useMemo(() => sortByStartAtDesc(logsQuery.data?.results ?? []), [logsQuery.data]);
  const defsById = useMemo(() => new Map(defs.map((d) => [d.id, d])), [defs]);
  const activeDefs = useMemo(() => defs.filter((d) => !d.archived), [defs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const def = defsById.get(log.symptomDefId);
      if (categoryFilter !== "all" && def?.category !== categoryFilter) return false;
      if (symptomDefFilter !== "all" && log.symptomDefId !== symptomDefFilter) return false;
      return true;
    });
  }, [logs, defsById, categoryFilter, symptomDefFilter]);

  const editingLog: SymptomLog | null = editingLogId ? logs.find((l) => l.id === editingLogId) ?? null : null;
  const editingDef: SymptomDefinition | null = editingDefId ? defs.find((d) => d.id === editingDefId) ?? null : null;

  const isLoading = defsQuery.isLoading || logsQuery.isLoading;
  const isError = defsQuery.isError || logsQuery.isError;

  const [defManagerFromLogForm, setDefManagerFromLogForm] = useState(false);

  function handleCreateDefFromLogForm() {
    setDefManagerFromLogForm(true);
    openCreateDef();
  }

  function handleCloseDefForm() {
    if (defManagerFromLogForm) {
      setDefManagerFromLogForm(false);
      closeDefForm();
      openCreateLog(prefillDefId ?? undefined);
      return;
    }
    // 由「管理症狀」清單進入的新增／編輯：返回清單而非直接關閉整個對話框。
    openCreateDef();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-ink">症狀</h1>
          <p className="mt-1 text-body text-ink-muted">
            記錄疼痛、痠麻、腫脹、疲勞、頭痛、情緒或壓力等症狀，觀察隨時間的變化。
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => openCreateDef()}>
            管理症狀
          </Button>
          <Button type="button" onClick={() => openCreateLog()}>
            + 快速紀錄
          </Button>
        </div>
      </header>

      {activeDefs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeDefs.map((def) => (
            <button
              key={def.id}
              type="button"
              onClick={() => openCreateLog(def.id)}
              className="rounded-full border border-line-strong px-3 py-1.5 text-caption text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              + {def.name}
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <ErrorState
          description="症狀資料載入失敗，請檢查連線後重試。"
          onRetry={() => {
            defsQuery.refetch();
            logsQuery.refetch();
          }}
        />
      ) : defs.length === 0 ? (
        <EmptyState
          title="尚未建立任何症狀"
          description="先建立一個症狀項目（例如「偏頭痛」），就能開始快速記錄每次發作。"
          action={
            <Button type="button" onClick={() => openCreateDef()}>
              + 新增症狀
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="依分類篩選"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[{ value: "all", label: "全部" }, ...SYMPTOM_CATEGORIES]}
            />
            <div className="w-48">
              <Select
                label="依症狀篩選"
                value={symptomDefFilter}
                onChange={(e) => setSymptomDefFilter(e.target.value)}
                options={[{ value: "all", label: "全部症狀" }, ...defs.map((d) => ({ value: d.id, label: d.name }))]}
              />
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <EmptyState
              title="目前沒有符合篩選條件的紀錄"
              description="試著調整篩選條件，或新增一筆症狀紀錄。"
              action={
                <Button type="button" onClick={() => openCreateLog()}>
                  + 快速紀錄
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {filteredLogs.map((log) => (
                <li key={log.id}>
                  <SymptomLogCard
                    log={log}
                    def={defsById.get(log.symptomDefId)}
                    onEdit={() => openEditLog(log.id)}
                    onDelete={() => deleteLog(log)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {lastDeletedLog ? (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto w-fit max-w-[92vw] sm:bottom-6">
          <UndoBanner
            message="已刪除此筆症狀紀錄"
            onUndo={() => restoreLog(lastDeletedLog)}
            onDismiss={() => setLastDeletedLog(null)}
          />
        </div>
      ) : null}

      <SymptomLogFormSheet
        open={logFormOpen}
        onClose={closeLogForm}
        editing={editingLog}
        defs={defs}
        prefillDefId={prefillDefId}
        onCreateDef={handleCreateDefFromLogForm}
      />

      <SymptomDefManager
        open={defManagerOpen && !editingDefId}
        onClose={closeDefForm}
        defs={defs}
        onEdit={(def) => openEditDef(def.id)}
        onCreate={() => openEditDef("__new__")}
      />

      <SymptomDefFormSheet
        open={defManagerOpen && editingDefId !== null}
        onClose={handleCloseDefForm}
        editing={editingDefId && editingDefId !== "__new__" ? editingDef : null}
      />
    </div>
  );
}
