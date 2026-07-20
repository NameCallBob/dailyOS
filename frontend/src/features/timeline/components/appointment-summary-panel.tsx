"use client";

import { StatTile } from "@/components/ui/stat-tile";

import { formatDateTimeLong } from "../date-utils";
import type { AppointmentSummary } from "../utils";

export interface AppointmentSummaryPanelProps {
  summary: AppointmentSummary;
}

/** 回診摘要：下次回診、已完成／待就診次數、依醫師分布。 */
export function AppointmentSummaryPanel({ summary }: AppointmentSummaryPanelProps) {
  return (
    <section aria-label="回診摘要" className="flex flex-col gap-3">
      <h2 className="text-h3 text-ink">回診摘要</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="下次回診"
          value={summary.nextAppointmentAt ? formatDateTimeLong(summary.nextAppointmentAt).slice(5) : "無排程"}
        />
        <StatTile label="待就診" value={summary.upcomingCount} unit="次" />
        <StatTile label="已完成" value={summary.completedCount} unit="次" />
        <StatTile label="取消/未到" value={summary.cancelledCount} unit="次" />
      </div>
      {summary.nextAppointmentLabel ? (
        <p className="text-caption text-ink-muted">下次回診：{summary.nextAppointmentLabel}</p>
      ) : null}
      {summary.byDoctor.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-soft">
          {summary.byDoctor.map((d) => (
            <span key={d.doctor} className="tabular-nums">
              {d.doctor}：{d.count} 次
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
