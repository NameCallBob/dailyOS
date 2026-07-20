"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

import { TIMELINE_KINDS, TIMELINE_KIND_LABEL, type TimelineFilters, type TimelineKind } from "../types";

export interface FilterBarProps {
  filters: TimelineFilters;
  onChange: (filters: TimelineFilters) => void;
  onExport: () => void;
  exportDisabled?: boolean;
}

export function FilterBar({ filters, onChange, onExport, exportDisabled }: FilterBarProps) {
  function toggleKind(kind: TimelineKind) {
    const has = filters.kinds.includes(kind);
    const nextKinds = has ? filters.kinds.filter((k) => k !== kind) : [...filters.kinds, kind];
    onChange({ ...filters, kinds: nextKinds });
  }

  function selectAllKinds() {
    onChange({ ...filters, kinds: [...TIMELINE_KINDS] });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-paper-raised p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="搜尋"
            placeholder="搜尋標題、備註、地點…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
        <Input
          label="起始日期"
          type="date"
          value={filters.dateStart ?? ""}
          onChange={(e) => onChange({ ...filters, dateStart: e.target.value || undefined })}
        />
        <Input
          label="結束日期"
          type="date"
          value={filters.dateEnd ?? ""}
          onChange={(e) => onChange({ ...filters, dateEnd: e.target.value || undefined })}
        />
        <Button type="button" variant="secondary" onClick={onExport} disabled={exportDisabled}>
          匯出 CSV
        </Button>
      </div>

      <div role="group" aria-label="依類型篩選" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllKinds}
          className={cn(
            "rounded-full border px-3 py-1 text-caption transition-colors",
            filters.kinds.length === TIMELINE_KINDS.length
              ? "border-ink bg-ink text-paper"
              : "border-line-strong text-ink-soft hover:text-ink",
          )}
        >
          全部
        </button>
        {TIMELINE_KINDS.map((kind) => {
          const active = filters.kinds.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={active}
              onClick={() => toggleKind(kind)}
              className={cn(
                "rounded-full border px-3 py-1 text-caption transition-colors",
                active ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-soft hover:text-ink",
              )}
            >
              {TIMELINE_KIND_LABEL[kind]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
