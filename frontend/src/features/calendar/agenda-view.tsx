"use client";

/**
 * features/calendar/agenda-view.tsx — 議程檢視：依日期分組的線性列表，適合快速掃描近期事項。
 */
import { EmptyState } from "@/components/ui/empty-state";

import { formatDateLabel, toDateKey } from "./date-utils";
import { EventChip } from "./event-chip";
import type { Occurrence } from "./recurrence";

export interface AgendaViewProps {
  occurrences: Occurrence[];
  conflictIds: Set<string>;
  onOpenEvent: (occurrence: Occurrence) => void;
}

export function AgendaView({ occurrences, conflictIds, onOpenEvent }: AgendaViewProps) {
  if (occurrences.length === 0) {
    return <EmptyState title="這段期間沒有事件" description="切換日期範圍，或新增一個事件開始規劃。" />;
  }

  const groups = new Map<string, Occurrence[]>();
  for (const occ of occurrences) {
    const key = toDateKey(occ.start);
    const list = groups.get(key) ?? [];
    list.push(occ);
    groups.set(key, list);
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(groups.entries()).map(([key, items]) => (
        <div key={key} className="rounded-lg border border-line bg-paper-raised p-4">
          <h3 className="mb-2 text-h3 text-ink">{formatDateLabel(items[0]?.start ?? new Date(key))}</h3>
          <div className="flex flex-col gap-1">
            {items.map((occ) => (
              <EventChip key={occ.occurrenceId} occurrence={occ} conflicted={conflictIds.has(occ.occurrenceId)} onOpen={onOpenEvent} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
