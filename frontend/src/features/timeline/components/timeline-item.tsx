"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { formatTime } from "../date-utils";
import { TIMELINE_KIND_LABEL, TIMELINE_KIND_TONE, type TimelineEntry } from "../types";

export interface TimelineItemProps {
  entry: TimelineEntry;
  onEdit?: (entry: TimelineEntry) => void;
  onDelete?: (entry: TimelineEntry) => void;
}

export function TimelineItem({ entry, onEdit, onDelete }: TimelineItemProps) {
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-line bg-paper-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={TIMELINE_KIND_TONE[entry.kind]}>{TIMELINE_KIND_LABEL[entry.kind]}</Badge>
          <span className="text-caption tabular-nums text-ink-muted">{formatTime(entry.at)}</span>
        </div>
        {entry.editable ? (
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit?.(entry)}>
              編輯
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onDelete?.(entry)}>
              刪除
            </Button>
          </div>
        ) : null}
      </div>
      <p className="text-body font-medium text-ink">{entry.title}</p>
      {entry.subtitle ? <p className="text-caption text-ink-muted">{entry.subtitle}</p> : null}
      {entry.meta.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption tabular-nums text-ink-soft">
          {entry.meta.map((m, i) => (
            <span key={`${entry.id}-meta-${i}`}>{m}</span>
          ))}
        </div>
      ) : null}
      {entry.notes ? <p className="text-caption text-ink-muted">{entry.notes}</p> : null}
    </li>
  );
}
