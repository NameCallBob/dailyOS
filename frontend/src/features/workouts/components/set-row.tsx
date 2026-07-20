"use client";

/** set-row.tsx — 單一組數的行內編輯列（reps / weight / rest / rpe / rir / side / warmup / working / PR）。 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import type { WorkoutSet } from "../schema";
import { SET_SIDE_LABELS, SET_SIDES } from "../types";
import { setVolume } from "../utils";

export interface SetRowProps {
  set: WorkoutSet;
  index: number;
  onUpdate: (patch: Partial<WorkoutSet>) => void;
  onDelete: () => void;
}

function numOrUndef(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

export function SetRow({ set, index, onUpdate, onDelete }: SetRowProps) {
  const [reps, setReps] = useState(set.reps?.toString() ?? "");
  const [weight, setWeight] = useState(set.weightKg?.toString() ?? "");
  const [rest, setRest] = useState(set.restSec?.toString() ?? "");
  const [rpe, setRpe] = useState(set.rpe?.toString() ?? "");

  return (
    <div
      className={cn(
        "grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr_auto_auto] items-center gap-2 rounded-md px-1 py-1.5 text-caption",
        set.isWarmup ? "text-ink-muted" : "text-ink",
      )}
    >
      <span className="tabular-nums text-ink-faint" aria-hidden>
        {index + 1}
      </span>

      <label className="flex flex-col gap-0.5">
        <span className="sr-only">次數</span>
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          placeholder="次數"
          aria-label={`第 ${index + 1} 組次數`}
          onChange={(e) => setReps(e.target.value)}
          onBlur={() => onUpdate({ reps: numOrUndef(reps) })}
          className="h-8 rounded border border-line-strong bg-paper px-2 text-caption tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="sr-only">重量（kg）</span>
        <input
          type="number"
          step="0.5"
          inputMode="decimal"
          value={weight}
          placeholder="重量 kg"
          aria-label={`第 ${index + 1} 組重量`}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={() => onUpdate({ weightKg: numOrUndef(weight) })}
          className="h-8 rounded border border-line-strong bg-paper px-2 text-caption tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="sr-only">休息（秒）</span>
        <input
          type="number"
          inputMode="numeric"
          value={rest}
          placeholder="休息秒"
          aria-label={`第 ${index + 1} 組休息秒數`}
          onChange={(e) => setRest(e.target.value)}
          onBlur={() => onUpdate({ restSec: numOrUndef(rest) })}
          className="h-8 rounded border border-line-strong bg-paper px-2 text-caption tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="sr-only">RPE</span>
        <input
          type="number"
          min={1}
          max={10}
          value={rpe}
          placeholder="RPE"
          aria-label={`第 ${index + 1} 組 RPE`}
          onChange={(e) => setRpe(e.target.value)}
          onBlur={() => onUpdate({ rpe: numOrUndef(rpe) })}
          className="h-8 rounded border border-line-strong bg-paper px-2 text-caption tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>

      <div className="flex items-center gap-1">
        <select
          aria-label={`第 ${index + 1} 組側邊`}
          value={set.side ?? ""}
          onChange={(e) => onUpdate({ side: (e.target.value || undefined) as WorkoutSet["side"] })}
          className="h-8 rounded border border-line-strong bg-paper px-1 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">—</option>
          {SET_SIDES.map((s) => (
            <option key={s} value={s}>
              {SET_SIDE_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onUpdate({ isWarmup: !set.isWarmup, isWorking: set.isWarmup })}
          aria-pressed={set.isWarmup}
          title="暖身組"
          className={cn(
            "h-8 rounded border px-2 text-[10px]",
            set.isWarmup ? "border-warning bg-warning-soft text-warning" : "border-line-strong text-ink-muted",
          )}
        >
          暖身
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ isPr: !set.isPr })}
          aria-pressed={set.isPr}
          title="標記為個人最佳"
          className={cn(
            "h-8 rounded border px-2 text-[10px]",
            set.isPr ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-ink-muted",
          )}
        >
          {set.isPr ? "★ PR" : "☆ PR"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden w-16 tabular-nums text-ink-muted sm:inline">{setVolume(set) > 0 ? `${setVolume(set)} kg` : ""}</span>
        <Button type="button" variant="ghost" size="sm" aria-label={`刪除第 ${index + 1} 組`} onClick={onDelete}>
          刪除
        </Button>
      </div>
    </div>
  );
}
