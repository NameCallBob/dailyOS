"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { formatScheduleSummary, formatTarget, formatValueWithUnit } from "../format";
import { useDeleteHabitWithUndo, useHabitQuickLog } from "../hooks";
import { habitsRepo } from "../repo";
import type { HabitStats } from "../stats";
import { useHabitsUiStore } from "../store";
import type { Habit } from "../types";
import { ProgressBar } from "./progress-bar";
import { TrendBar } from "./trend-bar";

export interface HabitCardProps {
  habit: Habit;
  stats: HabitStats;
}

export function HabitCard({ habit, stats }: HabitCardProps) {
  const openEditForm = useHabitsUiStore((s) => s.openEditForm);
  const openLogDialog = useHabitsUiStore((s) => s.openLogDialog);
  const archive = habitsRepo.actions.archive;
  const { deleteHabit } = useDeleteHabitWithUndo();
  const { displayValue, isPending, quickComplete } = useHabitQuickLog(habit, stats.todayLog);

  const needsPrecision = habit.type !== "boolean";
  const done = habit.type === "boolean" ? displayValue >= 1 : displayValue >= habit.targetValue;
  const quickLabel =
    habit.type === "boolean" ? (done ? "已完成 ✓" : "一鍵完成") : done ? "已達標 ✓" : `+${habit.increment}${habit.unit ?? ""}`;

  async function handleArchiveToggle() {
    try {
      await archive(habit.id);
      toast.success(habit.archived ? `已將「${habit.name}」移回進行中。` : `已封存「${habit.name}」，可從篩選找回。`);
    } catch {
      toast.error("操作失敗，請再試一次。");
    }
  }

  return (
    <Card className={habit.archived ? "opacity-70" : undefined}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-h2 leading-none">
            {habit.icon}
          </span>
          <div>
            <h3 className="text-h3 text-ink">{habit.name}</h3>
            <p className="text-caption text-ink-muted">
              {formatScheduleSummary(habit)} · {formatTarget(habit)}
            </p>
          </div>
        </div>
        {stats.streak > 0 ? (
          <Badge tone="accent" aria-label={`連續完成 ${stats.streak} 次`}>
            連續 {stats.streak}
          </Badge>
        ) : null}
      </CardHeader>

      <CardBody className="flex flex-col gap-4">
        {stats.todayScheduled ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-caption text-ink-muted">
              <span>今日進度</span>
              <span className="tabular-nums text-ink">{formatValueWithUnit(habit, displayValue)}</span>
            </div>
            <ProgressBar ratio={stats.progressRatio} label={`${habit.name} 今日進度`} />
          </div>
        ) : (
          <p className="text-caption text-ink-faint">今天不是排程日，休息一下也沒關係。</p>
        )}

        <div className="flex items-center justify-between">
          <div className="text-caption text-ink-muted">
            近 30 天完成率 <span className="tabular-nums text-ink">{stats.completionRate30}%</span>
          </div>
          <TrendBar trend={stats.trend} />
        </div>
      </CardBody>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {stats.todayScheduled ? (
          <Button
            size="sm"
            variant={done ? "secondary" : "primary"}
            onClick={quickComplete}
            loading={isPending}
            aria-label={habit.type === "boolean" ? quickLabel : `記錄 ${habit.name} ${quickLabel}`}
          >
            {quickLabel}
          </Button>
        ) : null}
        {needsPrecision ? (
          <Button size="sm" variant="ghost" onClick={() => openLogDialog(habit.id)}>
            輸入數值
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEditForm(habit.id)}>
            編輯
          </Button>
          <Button size="sm" variant="ghost" onClick={handleArchiveToggle}>
            {habit.archived ? "取消封存" : "封存"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => deleteHabit(habit)}>
            刪除
          </Button>
        </div>
      </div>
    </Card>
  );
}
