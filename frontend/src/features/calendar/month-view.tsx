"use client";

/**
 * features/calendar/month-view.tsx — 月檢視。以日為粒度支援拖曳（含鍵盤替代）搬移事件日期，
 * 時間（時分）維持不變。
 */
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

import { cn } from "@/lib/cn";

import { addDays, diffMinutes, formatTime, toDateKey } from "./date-utils";
import type { Occurrence } from "./recurrence";
import { CALENDAR_EVENT_TYPE_LABELS } from "./schema";
import type { MoveRequest } from "./time-grid";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const MAX_VISIBLE_PER_CELL = 3;
const CLICK_THRESHOLD_PX = 5;

export interface MonthViewProps {
  weeks: Date[][]; // 6 週 x 7 天
  monthDate: Date;
  occurrencesByDay: Map<string, Occurrence[]>;
  conflictIds: Set<string>;
  todayKey: string;
  onOpenEvent: (occurrence: Occurrence) => void;
  onOpenDay: (day: Date) => void;
  onRequestMove: (req: MoveRequest) => void;
  onQuickCreate: (day: Date) => void;
}

interface DragState {
  occurrence: Occurrence;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originRow: number;
  originCol: number;
  moved: boolean;
  deltaRow: number;
  deltaCol: number;
}

export function MonthView({
  weeks,
  monthDate,
  occurrencesByDay,
  conflictIds,
  todayKey,
  onOpenEvent,
  onOpenDay,
  onRequestMove,
  onQuickCreate,
}: MonthViewProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const currentMonth = monthDate.getMonth();

  const cellSize = () => {
    if (!gridRef.current) return { w: 0, h: 0 };
    const rect = gridRef.current.getBoundingClientRect();
    return { w: rect.width / 7, h: rect.height / weeks.length };
  };

  function handlePointerDown(occurrence: Occurrence, row: number, col: number, event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      occurrence,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originRow: row,
      originCol: col,
      moved: false,
      deltaRow: 0,
      deltaCol: 0,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { w, h } = cellSize();
    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    const deltaCol = w ? Math.round(dx / w) : 0;
    const deltaRow = h ? Math.round(dy / h) : 0;
    const moved = drag.moved || Math.abs(dx) > CLICK_THRESHOLD_PX || Math.abs(dy) > CLICK_THRESHOLD_PX;
    setDrag({ ...drag, deltaCol, deltaRow, moved });
  }

  function commitMove(occurrence: Occurrence, targetDay: Date) {
    const durationMinutes = diffMinutes(occurrence.start, occurrence.end);
    const originStart = occurrence.start;
    const newStart = new Date(targetDay);
    newStart.setHours(originStart.getHours(), originStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
    onRequestMove({ occurrence, newStart, newEnd });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const finished = drag;
    setDrag(null);
    if (!finished.moved) {
      onOpenEvent(finished.occurrence);
      return;
    }
    const targetRow = Math.min(weeks.length - 1, Math.max(0, finished.originRow + finished.deltaRow));
    const targetCol = Math.min(6, Math.max(0, finished.originCol + finished.deltaCol));
    const targetDay = weeks[targetRow]?.[targetCol];
    if (!targetDay) return;
    commitMove(finished.occurrence, targetDay);
  }

  function handleKeyDown(occurrence: Occurrence, row: number, col: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenEvent(occurrence);
      return;
    }
    let deltaDays = 0;
    if (event.key === "ArrowLeft") deltaDays = -1;
    else if (event.key === "ArrowRight") deltaDays = 1;
    else if (event.key === "ArrowUp") deltaDays = -7;
    else if (event.key === "ArrowDown") deltaDays = 7;
    else return;
    event.preventDefault();
    const targetDay = addDays(occurrence.start, deltaDays);
    commitMove(occurrence, targetDay);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-paper-raised">
      <div className="grid grid-cols-7 border-b border-line text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-label uppercase text-ink-muted">
            {label}
          </div>
        ))}
      </div>
      <div ref={gridRef} className="grid flex-1" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(96px, 1fr))` }}>
        {weeks.map((week, row) => (
          <div key={row} className="grid grid-cols-7">
            {week.map((day, col) => {
              const key = toDateKey(day);
              const isCurrentMonth = day.getMonth() === currentMonth;
              const isToday = key === todayKey;
              const occurrences = occurrencesByDay.get(key) ?? [];
              const visible = occurrences.slice(0, MAX_VISIBLE_PER_CELL);
              const overflowCount = occurrences.length - visible.length;

              return (
                <div
                  key={key}
                  className={cn(
                    "flex min-h-24 flex-col gap-0.5 border-b border-l border-line p-1",
                    !isCurrentMonth && "bg-paper-sunken/60",
                  )}
                  onDoubleClick={() => onQuickCreate(day)}
                >
                  <button
                    type="button"
                    onClick={() => onOpenDay(day)}
                    className={cn(
                      "self-start rounded-full px-1.5 text-caption tabular-nums",
                      isToday ? "bg-ink text-paper" : isCurrentMonth ? "text-ink" : "text-ink-faint",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    )}
                  >
                    {day.getDate()}
                  </button>
                  <div className="flex flex-1 flex-col gap-0.5">
                    {visible.map((occ) => {
                      const isDragging = drag?.occurrence.occurrenceId === occ.occurrenceId;
                      const conflicted = conflictIds.has(occ.occurrenceId);
                      return (
                        <button
                          key={occ.occurrenceId}
                          type="button"
                          onPointerDown={(e) => handlePointerDown(occ, row, col, e)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onKeyDown={(e) => handleKeyDown(occ, row, col, e)}
                          title={`${occ.event.title}（${CALENDAR_EVENT_TYPE_LABELS[occ.event.type]}）${conflicted ? " · 時間衝突" : ""}`}
                          className={cn(
                            "flex items-center gap-1 truncate rounded-sm border border-transparent px-1 py-0.5 text-left text-caption text-ink",
                            "touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                            conflicted ? "border-warning bg-warning-soft" : "bg-paper-sunken hover:border-line-strong",
                            isDragging && "opacity-80 shadow-md",
                          )}
                        >
                          {!occ.event.allDay ? <span className="shrink-0 tabular-nums text-ink-muted">{formatTime(occ.start)}</span> : null}
                          <span className="truncate">{occ.event.title}</span>
                        </button>
                      );
                    })}
                    {overflowCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => onOpenDay(day)}
                        className="text-left text-caption text-ink-muted underline underline-offset-2 hover:text-ink"
                      >
                        還有 {overflowCount} 筆
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
