"use client";

import { Badge } from "@/components/ui/badge";

import type { Workout } from "../schema";
import { CARDIO_TYPES, FEELING_LABELS } from "../types";
import { formatDecimal, formatInt, formatPace, formatTime } from "../utils";

export interface WorkoutCardProps {
  workout: Workout;
  onOpen: () => void;
}

export function WorkoutCard({ workout, onOpen }: WorkoutCardProps) {
  const isCardio = CARDIO_TYPES.has(workout.type);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-lg border border-line bg-paper-raised p-4 text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone="accent">{workout.type}</Badge>
          <span className="tabular-nums text-caption text-ink-muted">
            {formatTime(workout.startAt)} · {formatInt(workout.durationMin)} 分鐘
          </span>
        </div>
        <span className="text-caption text-ink-muted">{FEELING_LABELS[workout.feeling]}</span>
      </div>

      {workout.goal ? <p className="text-body text-ink">{workout.goal}</p> : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption tabular-nums text-ink-muted">
        {workout.rpe !== undefined ? <span>RPE {formatDecimal(workout.rpe, 0)}</span> : null}
        {workout.avgHr !== undefined ? <span>平均心率 {formatInt(workout.avgHr)} bpm</span> : null}
        {workout.calories !== undefined ? <span>{formatInt(workout.calories)} kcal</span> : null}
        {isCardio && workout.distanceKm !== undefined ? <span>{formatDecimal(workout.distanceKm, 1)} 公里</span> : null}
        {isCardio && workout.paceMinPerKm !== undefined ? <span>配速 {formatPace(workout.paceMinPerKm)}/km</span> : null}
        {isCardio && workout.avgSpeedKmh !== undefined ? <span>均速 {formatDecimal(workout.avgSpeedKmh, 1)} km/h</span> : null}
        {isCardio && workout.steps !== undefined ? <span>{formatInt(workout.steps)} 步</span> : null}
      </div>
    </button>
  );
}
