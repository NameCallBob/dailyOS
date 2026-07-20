"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useHabitQuickLog } from "../hooks";
import { useHabitsUiStore } from "../store";
import type { Habit, HabitLog } from "../types";

export interface LogEntryDialogProps {
  habit: Habit;
  todayLog?: HabitLog;
}

/** 需要精確數值的類型（計數/數值/時長）用來手動輸入今日數值的 bottom sheet。 */
export function LogEntryDialog({ habit, todayLog }: LogEntryDialogProps) {
  const open = useHabitsUiStore((s) => s.logDialogHabitId === habit.id);
  const closeLogDialog = useHabitsUiStore((s) => s.closeLogDialog);
  const { displayValue, setExact, adjust, isPending } = useHabitQuickLog(habit, todayLog);
  const [draft, setDraft] = useState(String(displayValue));
  // 開啟狀態切換時，於 render 期間同步一次草稿值（React 建議做法，避免在 effect 中
  // setState 造成連鎖重新渲染）；開啟後續輸入由使用者主導，不再被覆蓋。
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(String(displayValue));
  }

  function handleSave() {
    const parsed = Number(draft);
    if (Number.isNaN(parsed) || parsed < 0) return;
    setExact(parsed);
    closeLogDialog();
  }

  const step = habit.increment || 1;

  return (
    <Sheet
      open={open}
      onClose={closeLogDialog}
      title={`記錄「${habit.name}」`}
      description={habit.unit ? `今日累積量，單位：${habit.unit}` : "今日累積量"}
      footer={
        <>
          <Button variant="secondary" onClick={closeLogDialog}>
            取消
          </Button>
          <Button onClick={handleSave} loading={isPending}>
            儲存
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={`減少 ${step}`}
            onClick={() => {
              adjust(-step);
              setDraft(String(Math.max(0, displayValue - step)));
            }}
          >
            −{step}
          </Button>
          <Input
            aria-label="今日數值"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-28 text-center text-numeric tabular-nums"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={`增加 ${step}`}
            onClick={() => {
              adjust(step);
              setDraft(String(displayValue + step));
            }}
          >
            +{step}
          </Button>
        </div>
        <p className="text-center text-caption text-ink-muted">目標 {habit.targetValue}{habit.unit}</p>
      </div>
    </Sheet>
  );
}
