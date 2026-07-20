/**
 * features/symptoms/hooks.ts — 刪除症狀紀錄 + 復原（Undo）的組合邏輯。
 * 底層一律呼叫 symptomLogsResource（repo），此處只負責提示與 5 秒復原視窗。
 */

"use client";

import { useCallback } from "react";

import { toast } from "@/components/ui/toast";

import { symptomLogsResource } from "./resources";
import type { SymptomLog } from "./schema";
import { useSymptomsUiStore } from "./store";

/** 刪除症狀紀錄（軟刪除）並提供短時間內的復原能力。 */
export function useDeleteLogWithUndo() {
  const remove = symptomLogsResource.useRemove();
  const setLastDeletedLog = useSymptomsUiStore((s) => s.setLastDeletedLog);

  const deleteLog = useCallback(
    (log: SymptomLog) => {
      remove.mutate(log.id, {
        onSuccess: () => {
          setLastDeletedLog(log);
          toast.info("已刪除此筆紀錄，可於 5 秒內復原。", 5000);
          window.setTimeout(() => {
            if (useSymptomsUiStore.getState().lastDeletedLog?.id === log.id) {
              setLastDeletedLog(null);
            }
          }, 5000);
        },
      });
    },
    [remove, setLastDeletedLog],
  );

  return { deleteLog, isPending: remove.isPending };
}

export function useRestoreLog() {
  const update = symptomLogsResource.useUpdate();
  const setLastDeletedLog = useSymptomsUiStore((s) => s.setLastDeletedLog);

  return useCallback(
    (log: SymptomLog) => {
      update.mutate(
        { id: log.id, patch: { deleted: false } },
        {
          onSuccess: () => {
            setLastDeletedLog(null);
            toast.success("已復原此筆紀錄。");
          },
        },
      );
    },
    [setLastDeletedLog, update],
  );
}
