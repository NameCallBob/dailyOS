"use client";

/** pr-list.tsx — 個人最佳（依估算 1RM，Epley 公式）清單。 */

import { EmptyState } from "@/components/ui/empty-state";

import type { PersonalBest } from "../utils";
import { formatDateShort, formatDecimal, formatInt } from "../utils";

export interface PrListProps {
  bests: PersonalBest[];
  nameByExerciseId: Map<string, string>;
}

export function PrList({ bests, nameByExerciseId }: PrListProps) {
  if (bests.length === 0) {
    return <EmptyState title="尚無個人最佳紀錄" description="記錄重訓組數（次數與重量）後，即可自動估算個人最佳。" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-caption">
        <thead>
          <tr className="border-b border-line text-left text-label uppercase text-ink-muted">
            <th className="py-2 pr-3 font-normal">動作</th>
            <th className="py-2 pr-3 font-normal">最佳單組</th>
            <th className="py-2 pr-3 font-normal">估算 1RM</th>
            <th className="py-2 font-normal">達成日期</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {bests.map((best) => (
            <tr key={best.exerciseDefId}>
              <td className="py-2 pr-3 text-ink">{nameByExerciseId.get(best.exerciseDefId) ?? "未知動作"}</td>
              <td className="py-2 pr-3 tabular-nums text-ink">
                {formatInt(best.set.weightKg)} kg × {formatInt(best.set.reps)}
              </td>
              <td className="py-2 pr-3 tabular-nums text-ink">{formatDecimal(best.estimated1Rm, 1)} kg</td>
              <td className="py-2 tabular-nums text-ink-muted">{best.achievedDate ? formatDateShort(best.achievedDate) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
