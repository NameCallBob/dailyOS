import { StatTile } from "@/components/ui/stat-tile";
import type { HabitStats } from "../stats";
import type { Habit } from "../types";

export interface StatSummaryProps {
  habits: Habit[];
  statsByHabit: Map<string, HabitStats>;
}

export function StatSummary({ habits, statsByHabit }: StatSummaryProps) {
  const active = habits.filter((h) => !h.archived);
  const scheduledToday = active.filter((h) => statsByHabit.get(h.id)?.todayScheduled);
  const doneToday = scheduledToday.filter((h) => statsByHabit.get(h.id)?.todayDone);
  const todayRate = scheduledToday.length > 0 ? Math.round((doneToday.length / scheduledToday.length) * 100) : 0;

  const avgStreak =
    active.length > 0
      ? Math.round(active.reduce((sum, h) => sum + (statsByHabit.get(h.id)?.streak ?? 0), 0) / active.length)
      : 0;

  const avgRate30 =
    active.length > 0
      ? Math.round(active.reduce((sum, h) => sum + (statsByHabit.get(h.id)?.completionRate30 ?? 0), 0) / active.length)
      : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="今日完成率" value={todayRate} unit="%" />
      <StatTile label="今日已完成" value={`${doneToday.length} / ${scheduledToday.length}`} />
      <StatTile label="平均連續天數" value={avgStreak} unit="天" />
      <StatTile label="近 30 天平均完成率" value={avgRate30} unit="%" />
    </div>
  );
}
