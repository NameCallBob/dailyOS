"use client";

/**
 * features/calendar/time-grid.tsx — 日／週檢視共用的時間格元件。
 *
 * 拖曳調整時間：以 Pointer Events + setPointerCapture 實作（不依賴外部 dnd 套件）。
 * 拖曳只在放開滑鼠時才提交（onRequestMove），提交前後皆由呼叫端決定是否需要
 * 二次確認（重複事件系列 / 時間衝突），避免「無聲」覆蓋資料。
 * 鍵盤替代：事件格可 focus，方向鍵調整時間／日期，Enter/Space 開啟編輯。
 */
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

import { cn } from "@/lib/cn";

import {
  addDays,
  addMinutes,
  clampMinutes,
  formatTime,
  formatWeekdayShort,
  minutesSinceMidnight,
  startOfDay,
  toDateKey,
} from "./date-utils";
import type { Occurrence } from "./recurrence";
import { EventChip } from "./event-chip";

export const HOUR_HEIGHT = 48; // px
const PX_PER_MINUTE = HOUR_HEIGHT / 60;
const SNAP_MINUTES = 15;
const CLICK_THRESHOLD_PX = 5;

export interface MoveRequest {
  occurrence: Occurrence;
  newStart: Date;
  newEnd: Date;
}

export interface TimeGridProps {
  days: Date[];
  timedOccurrences: Occurrence[];
  allDayOccurrences: Occurrence[];
  conflictIds: Set<string>;
  onOpenEvent: (occurrence: Occurrence) => void;
  onRequestMove: (req: MoveRequest) => void;
  onQuickCreate: (start: Date, end: Date) => void;
  todayKey: string;
}

interface DragState {
  occurrence: Occurrence;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originDayIndex: number;
  originStartMinutes: number;
  durationMinutes: number;
  deltaDayIndex: number;
  deltaMinutes: number;
  moved: boolean;
  columnWidthPx: number;
}

export function TimeGrid({
  days,
  timedOccurrences,
  allDayOccurrences,
  conflictIds,
  onOpenEvent,
  onRequestMove,
  onQuickCreate,
  todayKey,
}: TimeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const occurrencesByDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const day of days) map.set(toDateKey(day), []);
    for (const occ of timedOccurrences) {
      const key = toDateKey(occ.start);
      const list = map.get(key);
      if (list) list.push(occ);
    }
    return map;
  }, [days, timedOccurrences]);

  const allDayByDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const day of days) map.set(toDateKey(day), []);
    for (const occ of allDayOccurrences) {
      let cursor = startOfDay(occ.start);
      const end = occ.end;
      let guard = 0;
      while (cursor < end && guard < 62) {
        const key = toDateKey(cursor);
        const list = map.get(key);
        if (list) list.push(occ);
        cursor = addDays(cursor, 1);
        guard += 1;
      }
    }
    return map;
  }, [days, allDayOccurrences]);

  function columnWidth(): number {
    return gridRef.current ? gridRef.current.clientWidth / days.length : 0;
  }

  function handlePointerDown(occurrence: Occurrence, dayIndex: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (occurrence.event.allDay) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      occurrence,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originDayIndex: dayIndex,
      originStartMinutes: minutesSinceMidnight(occurrence.start),
      durationMinutes: Math.max(SNAP_MINUTES, Math.round((occurrence.end.getTime() - occurrence.start.getTime()) / 60000)),
      deltaDayIndex: 0,
      deltaMinutes: 0,
      moved: false,
      columnWidthPx: columnWidth() || 1,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    const width = drag.columnWidthPx || 1;
    const deltaDayIndex = days.length > 1 ? Math.round(dx / width) : 0;
    const deltaMinutes = Math.round(dy / PX_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES;
    const moved = drag.moved || Math.abs(dx) > CLICK_THRESHOLD_PX || Math.abs(dy) > CLICK_THRESHOLD_PX;
    setDrag({ ...drag, deltaDayIndex, deltaMinutes, moved });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const finished = drag;
    setDrag(null);
    if (!finished.moved) {
      onOpenEvent(finished.occurrence);
      return;
    }
    const targetDayIndex = Math.min(days.length - 1, Math.max(0, finished.originDayIndex + finished.deltaDayIndex));
    const targetDay = days[targetDayIndex] ?? days[0];
    if (!targetDay) return;
    const newStartMinutes = clampMinutes(finished.originStartMinutes + finished.deltaMinutes, SNAP_MINUTES);
    const newStart = addMinutes(startOfDay(targetDay), newStartMinutes);
    const newEnd = addMinutes(newStart, finished.durationMinutes);
    onRequestMove({ occurrence: finished.occurrence, newStart, newEnd });
  }

  function handleKeyDown(occurrence: Occurrence, dayIndex: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenEvent(occurrence);
      return;
    }
    const stepMinutes = event.shiftKey ? 60 : SNAP_MINUTES;
    let deltaMinutes = 0;
    let deltaDayIndex = 0;
    if (event.key === "ArrowUp") deltaMinutes = -stepMinutes;
    else if (event.key === "ArrowDown") deltaMinutes = stepMinutes;
    else if (event.key === "ArrowLeft" && days.length > 1) deltaDayIndex = -1;
    else if (event.key === "ArrowRight" && days.length > 1) deltaDayIndex = 1;
    else return;

    event.preventDefault();
    const durationMinutes = Math.max(SNAP_MINUTES, Math.round((occurrence.end.getTime() - occurrence.start.getTime()) / 60000));
    const targetDayIndex = Math.min(days.length - 1, Math.max(0, dayIndex + deltaDayIndex));
    const targetDay = days[targetDayIndex] ?? days[0];
    if (!targetDay) return;
    const newStartMinutes = clampMinutes(minutesSinceMidnight(occurrence.start) + deltaMinutes, SNAP_MINUTES);
    const newStart = addMinutes(startOfDay(targetDay), newStartMinutes);
    const newEnd = addMinutes(newStart, durationMinutes);
    onRequestMove({ occurrence, newStart, newEnd });
  }

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const hasAllDay = allDayOccurrences.length > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-paper-raised">
      {/* 星期標頭 */}
      <div
        className="grid border-b border-line text-center"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day) => {
          const key = toDateKey(day);
          const isToday = key === todayKey;
          return (
            <div key={key} className={cn("border-l border-line px-2 py-2", isToday && "bg-accent-soft")}>
              <p className="text-label uppercase text-ink-muted">{formatWeekdayShort(day)}</p>
              <p className={cn("text-body tabular-nums", isToday ? "font-semibold text-accent" : "text-ink")}>{day.getDate()}</p>
            </div>
          );
        })}
      </div>

      {/* 全天事件列 */}
      {hasAllDay ? (
        <div
          className="grid gap-y-1 border-b border-line py-1"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
        >
          <div className="px-2 text-right text-label text-ink-faint">全天</div>
          {days.map((day) => {
            const key = toDateKey(day);
            return (
              <div key={key} className="flex flex-col gap-0.5 border-l border-line px-1">
                {(allDayByDay.get(key) ?? []).map((occ) => (
                  <EventChip key={occ.occurrenceId} occurrence={occ} onOpen={onOpenEvent} conflicted={conflictIds.has(occ.occurrenceId)} compact />
                ))}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* 時間格 */}
      <div className="max-h-[65vh] overflow-y-auto">
        <div
          ref={gridRef}
          className="relative grid"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, height: HOUR_HEIGHT * 24 }}
        >
          {/* 小時標籤與橫線 */}
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="absolute left-0 right-1 -translate-y-2 text-right text-label text-ink-faint" style={{ top: h * HOUR_HEIGHT }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const key = toDateKey(day);
            const occurrences = occurrencesByDay.get(key) ?? [];
            return (
              <div
                key={key}
                className="relative border-l border-line"
                onDoubleClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const y = event.clientY - rect.top;
                  const minutes = clampMinutes(Math.round(y / PX_PER_MINUTE), SNAP_MINUTES);
                  const start = addMinutes(startOfDay(day), minutes);
                  onQuickCreate(start, addMinutes(start, 60));
                }}
              >
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-line/60" style={{ top: h * HOUR_HEIGHT }} />
                ))}
                {occurrences.map((occ) => {
                  const isDragging = drag?.occurrence.occurrenceId === occ.occurrenceId;
                  const startMinutes = minutesSinceMidnight(occ.start);
                  const durationMinutes = Math.max(15, Math.round((occ.end.getTime() - occ.start.getTime()) / 60000));
                  const top = startMinutes * PX_PER_MINUTE;
                  const height = Math.max(20, durationMinutes * PX_PER_MINUTE);
                  const conflicted = conflictIds.has(occ.occurrenceId);
                  const translateY = isDragging ? drag.deltaMinutes * PX_PER_MINUTE : 0;
                  const translateX = isDragging ? drag.deltaDayIndex * drag.columnWidthPx : 0;
                  return (
                    <button
                      key={occ.occurrenceId}
                      type="button"
                      onPointerDown={(e) => handlePointerDown(occ, dayIndex, e)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onKeyDown={(e) => handleKeyDown(occ, dayIndex, e)}
                      title={`${occ.event.title} ${formatTime(occ.start)}–${formatTime(occ.end)}${conflicted ? "（時間衝突）" : ""}`}
                      className={cn(
                        "absolute left-0.5 right-0.5 z-10 flex flex-col overflow-hidden rounded-md border px-1.5 py-1 text-left text-caption shadow-sm transition-shadow",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        "touch-none cursor-grab active:cursor-grabbing",
                        conflicted ? "border-warning bg-warning-soft text-ink" : "border-line-strong bg-paper text-ink",
                        isDragging && "opacity-90 shadow-lg",
                      )}
                      style={{
                        top,
                        height,
                        transform: isDragging ? `translate(${translateX}px, ${translateY}px)` : undefined,
                      }}
                    >
                      <span className="truncate font-medium">{occ.event.title}</span>
                      <span className="truncate tabular-nums text-ink-muted">
                        {formatTime(occ.start)}–{formatTime(occ.end)}
                      </span>
                      {conflicted ? (
                        <span className="mt-auto flex items-center gap-1 text-warning">
                          <span aria-hidden>▲</span>衝突
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t border-line px-3 py-2 text-caption text-ink-muted">
        拖曳事件可調整時間；也可先以 Tab 鍵移至事件並用方向鍵（Shift+方向鍵一次一小時）調整，Enter 開啟編輯。雙擊空白處可快速新增事件。
      </p>
    </div>
  );
}
