"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

import { noteVersionsRepo } from "../repo";
import { NOTE_VERSION_REASON_LABEL, type NoteVersion } from "../types";
import { excerpt, formatDateTime } from "../utils";

export interface VersionHistorySheetProps {
  open: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
  onRestore: (version: NoteVersion) => void;
}

export function VersionHistorySheet({ open, onClose, noteId, noteTitle, onRestore }: VersionHistorySheetProps) {
  const versionsQuery = noteVersionsRepo.useList({
    filters: { noteId },
    ordering: "-createdAt",
    pageSize: 200,
  });

  return (
    <Sheet open={open} onClose={onClose} title="版本紀錄" description={`「${noteTitle}」的歷史版本`}>
      {versionsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : versionsQuery.isError ? (
        <ErrorState
          description="版本紀錄載入失敗，請稍後再試一次。"
          onRetry={() => versionsQuery.refetch()}
        />
      ) : !versionsQuery.data || versionsQuery.data.results.length === 0 ? (
        <EmptyState title="尚無歷史版本" description="每次儲存變更或還原舊版時，都會在這裡留下一筆快照。" />
      ) : (
        <ol className="flex flex-col gap-3">
          {versionsQuery.data.results.map((v) => (
            <li key={v.id} className="rounded-md border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-body font-medium text-ink">{v.title || "（未命名筆記）"}</p>
                  <p className="text-caption text-ink-muted">
                    <time dateTime={v.createdAt} className="tabular-nums">
                      {formatDateTime(v.createdAt)}
                    </time>
                    {" · "}
                    {NOTE_VERSION_REASON_LABEL[v.reason]}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => onRestore(v)}>
                  還原此版本
                </Button>
              </div>
              <p className="mt-2 line-clamp-3 text-caption text-ink-soft">{excerpt(v.content, 140)}</p>
            </li>
          ))}
        </ol>
      )}
    </Sheet>
  );
}
