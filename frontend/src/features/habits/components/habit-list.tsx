"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { habitLogsRepo, habitsRepo } from "../repo";
import { computeHabitStats } from "../stats";
import { useHabitsUiStore, type HabitFilter } from "../store";
import type { Habit } from "../types";
import { HabitCard } from "./habit-card";
import { HabitFormSheet } from "./habit-form-sheet";
import { HabitUndoBar } from "./habit-undo-bar";
import { LogEntryDialog } from "./log-entry-dialog";
import { StatSummary } from "./stat-summary";

const FILTER_OPTIONS: { value: HabitFilter; label: string }[] = [
  { value: "active", label: "進行中" },
  { value: "archived", label: "已封存" },
  { value: "all", label: "全部" },
];

export function HabitList() {
  const filter = useHabitsUiStore((s) => s.filter);
  const setFilter = useHabitsUiStore((s) => s.setFilter);
  const formOpen = useHabitsUiStore((s) => s.formOpen);
  const editingHabitId = useHabitsUiStore((s) => s.editingHabitId);
  const openCreateForm = useHabitsUiStore((s) => s.openCreateForm);

  const habitsQuery = habitsRepo.useList({ ordering: "sortOrder", pageSize: 200 });
  const logsQuery = habitLogsRepo.useList({ pageSize: 1000, ordering: "-date" });

  const isLoading = habitsQuery.isLoading || logsQuery.isLoading;
  const isError = habitsQuery.isError || logsQuery.isError;

  const allHabits = useMemo(() => habitsQuery.data?.results ?? [], [habitsQuery.data]);
  const allLogs = useMemo(() => logsQuery.data?.results ?? [], [logsQuery.data]);

  const statsByHabit = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeHabitStats>>();
    for (const habit of allHabits) {
      map.set(habit.id, computeHabitStats(habit, allLogs));
    }
    return map;
  }, [allHabits, allLogs]);

  const visibleHabits = useMemo(() => {
    const filtered = allHabits.filter((habit) => {
      if (filter === "active") return !habit.archived;
      if (filter === "archived") return habit.archived;
      return true;
    });
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [allHabits, filter]);

  const editingHabit: Habit | undefined = editingHabitId
    ? allHabits.find((h) => h.id === editingHabitId)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">習慣</h1>
        <p className="text-caption text-ink-muted">
          追蹤日常習慣的進度與連續天數；沒完成的日子不會被記為「失敗」，只是還沒開始而已。
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-paper-raised py-16 text-ink-muted">
          <Spinner /> 載入習慣資料中…
        </div>
      ) : isError ? (
        <ErrorState
          description="習慣資料載入失敗，請稍後再試一次。"
          onRetry={() => {
            habitsQuery.refetch();
            logsQuery.refetch();
          }}
        />
      ) : allHabits.length === 0 ? (
        <EmptyState
          title="還沒有任何習慣"
          description="新增第一個習慣，例如喝水、閱讀或運動，開始累積屬於你的連續紀錄。"
          action={<Button onClick={openCreateForm}>新增習慣</Button>}
        />
      ) : (
        <>
          <StatSummary habits={allHabits.filter((h) => !h.archived)} statsByHabit={statsByHabit} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented label="篩選習慣" options={FILTER_OPTIONS} value={filter} onChange={(v) => setFilter(v as HabitFilter)} />
            <Button onClick={openCreateForm}>+ 新增習慣</Button>
          </div>

          {visibleHabits.length === 0 ? (
            <EmptyState
              title={filter === "archived" ? "沒有已封存的習慣" : "這個篩選條件下沒有習慣"}
              description="切換篩選條件，或新增一個新習慣。"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleHabits.map((habit) => {
                const stats = statsByHabit.get(habit.id);
                if (!stats) return null;
                return <HabitCard key={habit.id} habit={habit} stats={stats} />;
              })}
            </div>
          )}
        </>
      )}

      {formOpen ? <HabitFormSheet habit={editingHabit} /> : null}
      {allHabits
        .filter((h) => h.type !== "boolean")
        .map((habit) => (
          <LogEntryDialog key={habit.id} habit={habit} todayLog={statsByHabit.get(habit.id)?.todayLog} />
        ))}
      <HabitUndoBar />
    </div>
  );
}
