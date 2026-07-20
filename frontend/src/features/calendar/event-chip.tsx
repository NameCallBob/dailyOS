"use client";

/**
 * features/calendar/event-chip.tsx — 月檢視／議程檢視共用的簡易事件標籤（非時間格）。
 */
import type { KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

import { formatTime } from "./date-utils";
import type { Occurrence } from "./recurrence";

const TYPE_DOT: Record<string, string> = {
  meeting: "bg-accent",
  task: "bg-ink",
  personal: "bg-success",
  health: "bg-danger",
  reminder: "bg-warning",
  other: "bg-ink-faint",
};

export interface EventChipProps {
  occurrence: Occurrence;
  conflicted?: boolean;
  onOpen: (occurrence: Occurrence) => void;
  className?: string;
  compact?: boolean;
}

export function EventChip({ occurrence, conflicted, onOpen, className, compact }: EventChipProps) {
  const { event, start } = occurrence;

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(occurrence);
    }
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(occurrence)}
      onKeyDown={handleKeyDown}
      title={`${event.title}${conflicted ? "（時間衝突）" : ""}`}
      className={cn(
        "flex w-full items-center gap-1.5 truncate rounded-sm border border-transparent bg-paper-sunken px-1.5 py-0.5 text-left text-caption text-ink transition-colors hover:border-line-strong",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        conflicted && "border-warning bg-warning-soft",
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TYPE_DOT[event.type] ?? "bg-ink-faint")} />
      {!event.allDay && !compact ? <span className="shrink-0 tabular-nums text-ink-muted">{formatTime(start)}</span> : null}
      <span className="truncate">{event.title}</span>
      {conflicted ? (
        <span aria-hidden className="ml-auto shrink-0 text-warning">
          ▲
        </span>
      ) : null}
    </button>
  );
}
