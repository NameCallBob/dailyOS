"use client";

/** body-part-distribution.tsx — 部位分布（依訓練容量，水平長條）。 */

import { EmptyState } from "@/components/ui/empty-state";

import type { CategoryDistributionEntry } from "../utils";
import { formatInt } from "../utils";

export interface BodyPartDistributionProps {
  entries: CategoryDistributionEntry[];
}

export function BodyPartDistribution({ entries }: BodyPartDistributionProps) {
  if (entries.length === 0) {
    return <EmptyState title="尚無部位分布資料" description="完成重訓／徒手訓練並記錄組數後即可顯示。" />;
  }

  const max = Math.max(...entries.map((e) => e.volume), 1);

  return (
    <ul className="flex flex-col gap-2.5" aria-label="部位訓練容量分布">
      {entries.map((entry) => (
        <li key={entry.category} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-caption text-ink-soft">{entry.category}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-paper-sunken">
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${Math.max((entry.volume / max) * 100, entry.volume > 0 ? 3 : 0)}%` }}
            />
          </div>
          <span className="w-24 shrink-0 text-right tabular-nums text-caption text-ink-muted">
            {formatInt(entry.volume)} kg · {entry.setCount} 組
          </span>
        </li>
      ))}
    </ul>
  );
}
