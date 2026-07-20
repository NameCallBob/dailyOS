"use client";

import { EmptyState } from "@/components/ui/empty-state";

import { groupByDate } from "../utils";
import type { TimelineEntry } from "../types";
import { TimelineItem } from "./timeline-item";

export interface TimelineListProps {
  entries: TimelineEntry[];
  onEdit?: (entry: TimelineEntry) => void;
  onDelete?: (entry: TimelineEntry) => void;
  emptyDescription?: string;
}

export function TimelineList({ entries, onEdit, onDelete, emptyDescription }: TimelineListProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="沒有符合條件的紀錄"
        description={emptyDescription ?? "試著調整篩選條件、日期區間或搜尋關鍵字。"}
      />
    );
  }

  const groups = groupByDate(entries);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.date}>
          <h3 className="mb-3 text-label uppercase text-ink-muted">
            {group.heading}
            <span className="ml-2 tabular-nums">（{group.entries.length}）</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {group.entries.map((entry) => (
              <TimelineItem key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
