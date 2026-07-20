"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { timeEntriesResource } from "./api";
import { formatDateLabel, formatDuration, formatTimeLabel } from "./format";
import { FOCUS_CATEGORY_LABELS, type TimeEntry } from "./types";

const UNDO_WINDOW_MS = 6000;

export function SessionHistory() {
  const { data, isLoading, isError, refetch } = timeEntriesResource.useList({ ordering: "-startAt", pageSize: 50 });
  const removeMutation = timeEntriesResource.useRemove();
  const updateMutation = timeEntriesResource.useUpdate();

  const [pendingUndo, setPendingUndo] = useState<TimeEntry | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const entries = (data?.results ?? []).filter((e) => !e.deleted);

  function handleDelete(entry: TimeEntry) {
    removeMutation.mutate(entry.id, {
      onSuccess: () => {
        setPendingUndo(entry);
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setPendingUndo(null), UNDO_WINDOW_MS);
      },
    });
  }

  function handleUndo() {
    if (!pendingUndo) return;
    updateMutation.mutate(
      { id: pendingUndo.id, patch: { deleted: false } },
      {
        onSuccess: () => toast.success("已復原刪除"),
      },
    );
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setPendingUndo(null);
  }

  if (isLoading) {
    return (
      <Card className="flex min-h-[160px] items-center justify-center">
        <Spinner />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <ErrorState description="無法載入時間紀錄，請稍後再試一次。" onRetry={() => void refetch()} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <CardHeader className="mb-0">
        <CardTitle>歷史紀錄</CardTitle>
      </CardHeader>

      {pendingUndo ? (
        <div role="status" className="flex items-center justify-between rounded-md border border-line-strong bg-paper-sunken px-4 py-3 text-caption text-ink">
          <span>已刪除「{pendingUndo.label}」</span>
          <Button variant="secondary" size="sm" onClick={handleUndo}>
            復原
          </Button>
        </div>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState title="尚無時間紀錄" description="開始一次計時，或手動補登過去的時間區段。" />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-body text-ink">{entry.label}</p>
                  <Badge tone="neutral">{FOCUS_CATEGORY_LABELS[entry.category]}</Badge>
                  {entry.source === "manual" ? <Badge tone="warning">手動補登</Badge> : null}
                </div>
                <p className="text-caption tabular-nums text-ink-muted">
                  {formatDateLabel(entry.startAt)} · {formatTimeLabel(entry.startAt)} – {formatTimeLabel(entry.endAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-numeric tabular-nums text-ink">{formatDuration(entry.durationSeconds)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`刪除「${entry.label}」時間紀錄`}
                  onClick={() => handleDelete(entry)}
                  disabled={removeMutation.isPending}
                >
                  刪除
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
