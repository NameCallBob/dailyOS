/**
 * features/habits/hooks.ts — 打卡（一鍵完成／調整數值）與刪除+復原的組合邏輯。
 * 底層一律呼叫 repo（habitLogsRepo / habitsRepo），此處只負責樂觀更新與提示。
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { toast } from "@/components/ui/toast";
import { nowIso } from "@/lib/resource";
import { today } from "./date";
import { habitLogsRepo, habitsRepo } from "./repo";
import { useHabitsUiStore } from "./store";
import type { Habit, HabitLog } from "./types";

interface UpsertInput {
  habit: Habit;
  existing?: HabitLog;
  nextValue: number;
}

async function upsertTodayLog({ habit, existing, nextValue }: UpsertInput): Promise<HabitLog | null> {
  const clamped = Math.max(0, nextValue);
  if (clamped <= 0) {
    if (existing) await habitLogsRepo.remove(existing.id);
    return null;
  }
  if (existing) {
    return habitLogsRepo.update(existing.id, { value: clamped, loggedAt: nowIso() });
  }
  return habitLogsRepo.create({
    habitId: habit.id,
    date: today(),
    value: clamped,
    loggedAt: nowIso(),
  });
}

/**
 * 單一習慣的「打卡」互動：提供樂觀的當日顯示數值（instant UI），
 * 背後非同步寫入 habit_logs；失敗時回滾並提示。
 */
export function useHabitQuickLog(habit: Habit, existing: HabitLog | undefined) {
  const queryClient = useQueryClient();
  const [optimisticValue, setOptimisticValue] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: upsertTodayLog,
    onError: () => {
      setOptimisticValue(null);
      toast.error(`「${habit.name}」記錄失敗，請再試一次。`);
    },
    onSuccess: () => {
      setOptimisticValue(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["habit_logs"] });
    },
  });

  const baseValue = existing?.value ?? 0;
  const displayValue = optimisticValue ?? baseValue;

  const commit = useCallback(
    (nextValue: number) => {
      const clamped = Math.max(0, nextValue);
      setOptimisticValue(clamped);
      mutation.mutate({ habit, existing, nextValue: clamped });
    },
    [existing, habit, mutation],
  );

  const setExact = useCallback((value: number) => commit(value), [commit]);
  const adjust = useCallback((delta: number) => commit(displayValue + delta), [commit, displayValue]);
  const toggleBoolean = useCallback(() => commit(displayValue >= 1 ? 0 : 1), [commit, displayValue]);
  const quickComplete = useCallback(() => {
    if (habit.type === "boolean") {
      toggleBoolean();
      return;
    }
    // 計數/數值/時長型的一鍵操作：每次點擊累加一個增量，可多次點擊逐步達標，
    // 也可透過「輸入數值」直接填寫精確值——避免「未達標=失敗」的單一判斷。
    commit(displayValue + (habit.increment || 1));
  }, [commit, displayValue, habit, toggleBoolean]);

  return {
    displayValue,
    isPending: mutation.isPending,
    setExact,
    adjust,
    toggleBoolean,
    quickComplete,
  };
}

/** 刪除習慣（軟刪除）並提供短時間內的復原（Undo）能力。 */
export function useDeleteHabitWithUndo() {
  const remove = habitsRepo.useRemove();
  const setLastDeleted = useHabitsUiStore((s) => s.setLastDeleted);

  const deleteHabit = useCallback(
    (habit: Habit) => {
      remove.mutate(habit.id, {
        onSuccess: () => {
          setLastDeleted(habit);
          toast.info(`已刪除「${habit.name}」，可於 5 秒內復原。`, 5000);
          window.setTimeout(() => {
            if (useHabitsUiStore.getState().lastDeleted?.id === habit.id) {
              setLastDeleted(null);
            }
          }, 5000);
        },
      });
    },
    [remove, setLastDeleted],
  );

  return { deleteHabit, isPending: remove.isPending };
}

export function useRestoreHabit() {
  const update = habitsRepo.useUpdate();
  const setLastDeleted = useHabitsUiStore((s) => s.setLastDeleted);

  return useCallback(
    (habit: Habit) => {
      update.mutate(
        { id: habit.id, patch: { deleted: false } },
        {
          onSuccess: () => {
            setLastDeleted(null);
            toast.success(`已復原「${habit.name}」。`);
          },
        },
      );
    },
    [setLastDeleted, update],
  );
}
