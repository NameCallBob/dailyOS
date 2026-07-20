"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { BODY_REGION_LABELS, type BodyRegionKey } from "../constants";
import type { SymptomDefinition, SymptomLog } from "../schema";
import { evaluateUrgency, formatDateTime, formatDuration, intensityTone } from "../utils";

export interface SymptomLogCardProps {
  log: SymptomLog;
  def: SymptomDefinition | undefined;
  onEdit: () => void;
  onDelete: () => void;
}

const intensityBadgeTone: Record<ReturnType<typeof intensityTone>, "neutral" | "warning" | "danger"> = {
  neutral: "neutral",
  warning: "warning",
  danger: "danger",
};

export function SymptomLogCard({ log, def, onEdit, onDelete }: SymptomLogCardProps) {
  const bodyLabel = log.bodyLocation
    ? BODY_REGION_LABELS[log.bodyLocation as BodyRegionKey] ?? log.bodyLocation
    : undefined;
  const duration = formatDuration(log.durationMin);
  const urgency = evaluateUrgency({ intensity: log.intensity, notes: log.notes, bodyLocation: log.bodyLocation, name: def?.name });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-paper-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body font-medium text-ink">{def?.name ?? "（症狀已刪除）"}</h3>
            {def ? <Badge tone="neutral">{def.category}</Badge> : null}
            <Badge tone={intensityBadgeTone[intensityTone(log.intensity)]} withGlyph>
              強度 <span className="tabular-nums">{log.intensity}</span>/10
            </Badge>
            {urgency.triggered ? (
              <Badge tone="warning">建議留意</Badge>
            ) : null}
          </div>
          <p className="text-caption tabular-nums text-ink-muted">
            {formatDateTime(log.startAt)}
            {duration ? ` · 持續 ${duration}` : ""}
            {bodyLabel ? ` · ${bodyLabel}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            編輯
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="text-danger">
            刪除
          </Button>
        </div>
      </div>

      {(log.triggers && log.triggers.length > 0) || (log.relief && log.relief.length > 0) ? (
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-caption text-ink-soft">
          {log.triggers && log.triggers.length > 0 ? (
            <span>
              <span className="text-ink-muted">誘因：</span>
              {log.triggers.join("、")}
            </span>
          ) : null}
          {log.relief && log.relief.length > 0 ? (
            <span>
              <span className="text-ink-muted">緩解：</span>
              {log.relief.join("、")}
            </span>
          ) : null}
        </div>
      ) : null}

      {log.notes ? <p className="text-body text-ink-soft">{log.notes}</p> : null}

      {log.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={log.photo} alt={`${def?.name ?? "症狀"}紀錄照片`} className="h-24 w-24 rounded-md border border-line object-cover" />
      ) : null}
    </div>
  );
}
