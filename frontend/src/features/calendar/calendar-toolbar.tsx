"use client";

/**
 * features/calendar/calendar-toolbar.tsx — 檢視切換、日期導覽、新增／匯入／匯出。
 */
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";

import type { CalendarViewMode } from "./store";

export interface CalendarToolbarProps {
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  rangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreate: () => void;
  onExport: () => void;
  onImportClick: () => void;
}

const VIEW_OPTIONS: { value: CalendarViewMode; label: string }[] = [
  { value: "day", label: "日" },
  { value: "week", label: "週" },
  { value: "month", label: "月" },
  { value: "agenda", label: "議程" },
];

export function CalendarToolbar({
  view,
  onViewChange,
  rangeLabel,
  onPrev,
  onNext,
  onToday,
  onCreate,
  onExport,
  onImportClick,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-line-strong">
          <button
            type="button"
            onClick={onPrev}
            aria-label="上一個範圍"
            className="flex h-9 w-9 items-center justify-center text-ink-muted hover:bg-paper-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="下一個範圍"
            className="flex h-9 w-9 items-center justify-center border-l border-line-strong text-ink-muted hover:bg-paper-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ›
          </button>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onToday}>
          今天
        </Button>
        <h2 className="text-h3 text-ink">{rangeLabel}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="檢視模式" value={view} onChange={(v) => onViewChange(v as CalendarViewMode)} options={VIEW_OPTIONS} />
        <Button type="button" variant="secondary" size="sm" onClick={onImportClick}>
          匯入 ICS
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onExport}>
          匯出 ICS
        </Button>
        <Button type="button" size="sm" onClick={onCreate}>
          新增事件
        </Button>
      </div>
    </div>
  );
}
