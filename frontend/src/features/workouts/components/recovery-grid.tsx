"use client";

/** recovery-grid.tsx — 近 N 天訓練／恢復日格狀圖，非純顏色（以圖形＋文字區分）。 */

import { cn } from "@/lib/cn";

import type { RecoveryDay } from "../utils";
import { formatDateShort } from "../utils";

export interface RecoveryGridProps {
  days: RecoveryDay[];
}

export function RecoveryGrid({ days }: RecoveryGridProps) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5" role="list" aria-label="近期訓練與恢復日">
        {days.map((day) => (
          <div
            key={day.date}
            role="listitem"
            title={`${day.date}：${day.hasWorkout ? `已訓練（${day.types.join("、")}）` : "恢復日"}`}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md border text-[10px] tabular-nums",
              day.hasWorkout
                ? "border-ink bg-ink text-paper"
                : "border-dashed border-line-strong bg-paper-sunken text-ink-faint",
            )}
          >
            {day.hasWorkout ? "●" : formatDateShort(day.date).split("/")[1]}
          </div>
        ))}
      </div>
      <p className="mt-2 text-caption text-ink-muted">深色實心方塊表示當日已訓練；虛線方塊為恢復日（數字為日期）。</p>
    </div>
  );
}
