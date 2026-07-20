/**
 * features/sleep/hooks.ts — 刪除 + 復原（Undo）的組合邏輯。
 * 底層一律呼叫 sleepLogsResource（optimistic update 已內建於 lib/resource.ts 的 useRemove/useUpdate）。
 */

"use client";

import { useCallback } from "react";

import { toast } from "@/components/ui/toast";
import { sleepLogsResource } from "./resource";
import type { SleepLog } from "./schema";
import { useSleepUiStore } from "./store";

const UNDO_WINDOW_MS = 5000;

export function useDeleteSleepLogWithUndo() {
  const remove = sleepLogsResource.useRemove();
  const setLastDeleted = useSleepUiStore((s) => s.setLastDeleted);

  const deleteLog = useCallback(
    (log: SleepLog) => {
      remove.mutate(log.id, {
        onSuccess: () => {
          setLastDeleted(log);
          toast.info(`已刪除 ${log.date} 的睡眠紀錄，可於 5 秒內復原。`, UNDO_WINDOW_MS);
          window.setTimeout(() => {
            if (useSleepUiStore.getState().lastDeleted?.id === log.id) {
              setLastDeleted(null);
            }
          }, UNDO_WINDOW_MS);
        },
      });
    },
    [remove, setLastDeleted],
  );

  return { deleteLog, isPending: remove.isPending };
}

export function useRestoreSleepLog() {
  const update = sleepLogsResource.useUpdate();
  const setLastDeleted = useSleepUiStore((s) => s.setLastDeleted);

  return useCallback(
    (log: SleepLog) => {
      update.mutate(
        { id: log.id, patch: { deleted: false } },
        {
          onSuccess: () => {
            setLastDeleted(null);
            toast.success(`已復原 ${log.date} 的睡眠紀錄。`);
          },
        },
      );
    },
    [setLastDeleted, update],
  );
}
