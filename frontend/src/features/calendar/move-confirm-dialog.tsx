"use client";

/**
 * features/calendar/move-confirm-dialog.tsx — 拖曳／鍵盤調整時間後的二次確認。
 *
 * 目的：拖曳不得造成無聲資料錯誤。凡「調整重複事件系列」或「產生時間衝突」，
 * 一律需使用者明確確認後才會提交更新；取消則畫面還原、不呼叫任何 mutation。
 */
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

import { formatDateLabel, formatTimeRange } from "./date-utils";
import { describeRecurrence } from "./recurrence";
import type { Occurrence } from "./recurrence";

export interface PendingMove {
  occurrence: Occurrence;
  newStart: Date;
  newEnd: Date;
  conflicts: Occurrence[];
}

export interface MoveConfirmDialogProps {
  pending: PendingMove | null;
  onCancel: () => void;
  onConfirm: () => void;
  submitting?: boolean;
}

export function MoveConfirmDialog({ pending, onCancel, onConfirm, submitting }: MoveConfirmDialogProps) {
  if (!pending) return null;
  const isRecurring = Boolean(pending.occurrence.event.recurrenceRule);
  const hasConflict = pending.conflicts.length > 0;

  return (
    <Dialog
      open
      onClose={onCancel}
      title="確認調整時間"
      description="請確認以下變更後再儲存，避免調整到非預期的事件。"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} loading={submitting}>
            確認調整
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-body text-ink">
        <div className="rounded-md border border-line bg-paper-sunken p-3">
          <p className="font-medium">{pending.occurrence.event.title}</p>
          <p className="text-caption text-ink-muted">
            {formatDateLabel(pending.newStart)} · {formatTimeRange(pending.newStart, pending.newEnd, pending.occurrence.event.allDay)}
          </p>
        </div>

        {isRecurring ? (
          <p className="rounded-md border border-warning bg-warning-soft p-3 text-caption text-ink">
            此事件為重複事件（{describeRecurrence(pending.occurrence.event.recurrenceRule)}）。調整將套用到「整個系列」的時間規則，而非單一次發生。
          </p>
        ) : null}

        {hasConflict ? (
          <div className="rounded-md border border-danger-soft bg-danger-soft/40 p-3 text-caption text-ink">
            <p className="mb-1 font-medium text-danger">此時段與 {pending.conflicts.length} 筆事件重疊：</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {pending.conflicts.slice(0, 5).map((c) => (
                <li key={c.occurrenceId}>
                  {c.event.title}（{formatTimeRange(c.start, c.end, c.event.allDay)}）
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
