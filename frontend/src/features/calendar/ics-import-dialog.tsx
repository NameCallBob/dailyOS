"use client";

/**
 * features/calendar/ics-import-dialog.tsx — ICS 匯入：選檔 -> 預覽解析結果（含逐筆錯誤）-> 確認匯入。
 */
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import { formatDateLabel, formatTimeRange } from "./date-utils";
import { parseIcs, type ImportedEvent } from "./ics";

export interface IcsImportDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (events: ImportedEvent[]) => Promise<void> | void;
}

export function IcsImportDialog({ open, onClose, onConfirm }: IcsImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [events, setEvents] = useState<ImportedEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFileName(null);
    setEvents([]);
    setErrors([]);
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const result = parseIcs(text);
    setFileName(file.name);
    setEvents(result.events);
    setErrors(result.errors);
  }

  async function handleConfirm() {
    if (events.length === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(events);
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="匯入 ICS 行事曆"
      description="選擇 .ics 檔案，確認解析結果無誤後匯入。"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            取消
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={events.length === 0} loading={submitting}>
            匯入 {events.length > 0 ? `${events.length} 筆` : ""}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,text/calendar"
          className="text-body text-ink file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-paper-sunken file:px-3 file:py-1.5 file:text-body"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {fileName ? <p className="text-caption text-ink-muted">已選擇：{fileName}</p> : null}

        {submitting ? (
          <div className="flex items-center gap-2 text-caption text-ink-muted">
            <Spinner size="sm" /> 匯入中…
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="rounded-md border border-danger-soft bg-danger-soft/40 p-3 text-caption text-ink">
            <p className="mb-1 font-medium text-danger">{errors.length} 筆事件無法解析，將不會被匯入：</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {events.length > 0 ? (
          <div className="max-h-64 overflow-y-auto rounded-md border border-line">
            <table className="w-full text-caption">
              <thead className="sticky top-0 bg-paper-sunken text-label uppercase text-ink-muted">
                <tr>
                  <th className="px-2 py-1.5 text-left">標題</th>
                  <th className="px-2 py-1.5 text-left">時間</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={`${ev.sourceUid ?? ev.title}-${i}`} className="border-t border-line">
                    <td className="px-2 py-1.5 text-ink">{ev.title}</td>
                    <td className="px-2 py-1.5 tabular-nums text-ink-muted">
                      {formatDateLabel(new Date(ev.startAt))} · {formatTimeRange(new Date(ev.startAt), new Date(ev.endAt), ev.allDay)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
