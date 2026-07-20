/**
 * features/tasks/hooks.ts — react-query 包裝：任務自訂 action（complete/uncomplete/snooze）、
 * 複製、批次操作、延遲刪除（Undo）。所有 mutation 皆為 optimistic update + 失敗 toast。
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

import { toast } from "@/components/ui/toast";
import type { BaseRecord, Page } from "@/lib/types";

import { newId, nowIso } from "@/lib/resource";

import { assertNoCycle, DependencyCycleError } from "./dependency";
import { tasksRepo, type SnoozePayload } from "./repo";
import type { Task } from "./types";

// ---------------------------------------------------------------------------
// 共用：於所有 list 快取中就地更新單筆記錄（optimistic）
// ---------------------------------------------------------------------------

function patchCachedLists<T extends BaseRecord>(
  queryClient: ReturnType<typeof useQueryClient>,
  resourceName: string,
  id: string,
  patch: Partial<T>,
) {
  queryClient.setQueriesData<Page<T>>({ queryKey: [resourceName, "list"] }, (page) => {
    if (!page) return page;
    return { ...page, results: page.results.map((row) => (row.id === id ? { ...row, ...patch } : row)) };
  });
  queryClient.setQueriesData<T>({ queryKey: [resourceName, "item", id] }, (item) =>
    item ? { ...item, ...patch } : item,
  );
}

function removeCachedListRow<T extends BaseRecord>(
  queryClient: ReturnType<typeof useQueryClient>,
  resourceName: string,
  id: string,
) {
  queryClient.setQueriesData<Page<T>>({ queryKey: [resourceName, "list"] }, (page) => {
    if (!page) return page;
    return { ...page, results: page.results.filter((row) => row.id !== id), count: Math.max(0, page.count - 1) };
  });
}

function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["tasks"] as QueryKey });
}

// ---------------------------------------------------------------------------
// 一鍵完成 / 取消完成
// ---------------------------------------------------------------------------

export function useTaskQuickComplete() {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const run = useCallback(
    async (task: Task) => {
      const willComplete = task.status !== "completed";
      setPendingIds((s) => new Set(s).add(task.id));
      patchCachedLists<Task>(queryClient, "tasks", task.id, {
        status: willComplete ? "completed" : "planned",
        completedAt: willComplete ? nowIso() : null,
      });
      try {
        if (willComplete) {
          await tasksRepo.actions.complete(task.id);
          toast.success(`「${task.title}」已完成`);
        } else {
          await tasksRepo.actions.uncomplete(task.id);
          toast.info(`「${task.title}」已取消完成`);
        }
      } catch (err) {
        patchCachedLists<Task>(queryClient, "tasks", task.id, { status: task.status, completedAt: task.completedAt });
        toast.error(err instanceof Error ? err.message : "操作失敗，請再試一次。");
      } finally {
        setPendingIds((s) => {
          const next = new Set(s);
          next.delete(task.id);
          return next;
        });
        invalidateTasks(queryClient);
      }
    },
    [queryClient],
  );

  return { toggleComplete: run, isPending: (id: string) => pendingIds.has(id) };
}

// ---------------------------------------------------------------------------
// 延後（snooze）
// ---------------------------------------------------------------------------

export function useTaskSnooze() {
  const queryClient = useQueryClient();
  return useCallback(
    async (task: Task, payload: SnoozePayload) => {
      const previousDueDate = task.dueDate;
      try {
        const updated = await tasksRepo.actions.snooze(task.id, payload);
        patchCachedLists<Task>(queryClient, "tasks", task.id, { dueDate: updated.dueDate });
        toast.success("已延後任務期限");
      } catch (err) {
        patchCachedLists<Task>(queryClient, "tasks", task.id, { dueDate: previousDueDate });
        toast.error(err instanceof Error ? err.message : "延後失敗，請再試一次。");
      } finally {
        invalidateTasks(queryClient);
      }
    },
    [queryClient],
  );
}

// ---------------------------------------------------------------------------
// 複製任務
// ---------------------------------------------------------------------------

export function useTaskDuplicate() {
  const queryClient = useQueryClient();
  return useCallback(
    async (task: Task) => {
      try {
        await tasksRepo.create({
          ...task,
          id: newId(),
          title: `${task.title}（複本）`,
          status: "inbox",
          completedAt: null,
          dependsOn: [],
        });
        toast.success("已複製任務");
        invalidateTasks(queryClient);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "複製失敗，請再試一次。");
      }
    },
    [queryClient],
  );
}

// ---------------------------------------------------------------------------
// 更新相依（含循環檢查）
// ---------------------------------------------------------------------------

export function useTaskUpdateDependencies() {
  const queryClient = useQueryClient();
  return useCallback(
    async (task: Task, allTasks: Task[], newDependsOn: string[]) => {
      try {
        assertNoCycle(
          allTasks.map((t) => ({ id: t.id, dependsOn: t.dependsOn })),
          task.id,
          newDependsOn,
        );
      } catch (err) {
        if (err instanceof DependencyCycleError) {
          toast.error(err.message);
          return false;
        }
        throw err;
      }
      try {
        await tasksRepo.update(task.id, { dependsOn: newDependsOn });
        invalidateTasks(queryClient);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "更新相依失敗，請再試一次。");
        return false;
      }
    },
    [queryClient],
  );
}

// ---------------------------------------------------------------------------
// 批次操作
// ---------------------------------------------------------------------------

export function useTaskBatchActions() {
  const queryClient = useQueryClient();

  const batchComplete = useCallback(
    async (ids: string[]) => {
      await Promise.allSettled(ids.map((id) => tasksRepo.actions.complete(id)));
      invalidateTasks(queryClient);
      toast.success(`已完成 ${ids.length} 項任務`);
    },
    [queryClient],
  );

  const batchSetStatus = useCallback(
    async (ids: string[], status: Task["status"]) => {
      await Promise.allSettled(ids.map((id) => tasksRepo.update(id, { status })));
      invalidateTasks(queryClient);
      toast.success(`已更新 ${ids.length} 項任務狀態`);
    },
    [queryClient],
  );

  const batchDelete = useCallback(
    async (ids: string[]) => {
      await Promise.allSettled(ids.map((id) => tasksRepo.remove(id)));
      invalidateTasks(queryClient);
      toast.success(`已刪除 ${ids.length} 項任務`);
    },
    [queryClient],
  );

  return { batchComplete, batchSetStatus, batchDelete };
}

// ---------------------------------------------------------------------------
// 延遲刪除（Undo）：樂觀從畫面移除，N 秒後才真正呼叫 remove()，
// 期間可復原（取消排程）。同時適用 tasks / projects。
// ---------------------------------------------------------------------------

const UNDO_WINDOW_MS = 6000;

export interface PendingDeletion {
  id: string;
  label: string;
  expiresAt: number;
}

export function useDeferredDelete<T extends BaseRecord & { title?: string; name?: string }>(
  resourceName: string,
  remove: (id: string) => Promise<void>,
) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingDeletion | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleDelete = useCallback(
    (record: T) => {
      const label = record.title ?? record.name ?? "此筆資料";
      removeCachedListRow(queryClient, resourceName, record.id);
      setPending({ id: record.id, label, expiresAt: Date.now() + UNDO_WINDOW_MS });
      timerRef.current = setTimeout(async () => {
        try {
          await remove(record.id);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "刪除失敗，請再試一次。");
        } finally {
          setPending(null);
          void queryClient.invalidateQueries({ queryKey: [resourceName] as QueryKey });
        }
      }, UNDO_WINDOW_MS);
      toast.info(`已刪除「${label}」`);
    },
    [queryClient, remove, resourceName],
  );

  const undo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPending(null);
    void queryClient.invalidateQueries({ queryKey: [resourceName] as QueryKey });
    toast.success("已復原");
  }, [queryClient, resourceName]);

  return { pending, scheduleDelete, undo };
}
