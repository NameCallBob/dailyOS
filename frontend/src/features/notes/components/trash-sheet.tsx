"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

import { notesRepo } from "../repo";
import { excerpt, formatDateTime } from "../utils";

export interface TrashSheetProps {
  open: boolean;
  onClose: () => void;
}

export function TrashSheet({ open, onClose }: TrashSheetProps) {
  const trashQuery = notesRepo.useList({ filters: { deleted: true }, ordering: "-updatedAt", pageSize: 200 });
  const restoreMutation = notesRepo.useUpdate();

  return (
    <Sheet open={open} onClose={onClose} title="垃圾桶" description="已刪除的筆記會保留在此，可隨時復原。">
      {trashQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : trashQuery.isError ? (
        <ErrorState description="垃圾桶載入失敗，請稍後再試一次。" onRetry={() => trashQuery.refetch()} />
      ) : !trashQuery.data || trashQuery.data.results.length === 0 ? (
        <EmptyState title="垃圾桶是空的" description="刪除的筆記會顯示在這裡。" />
      ) : (
        <ul className="flex flex-col gap-2">
          {trashQuery.data.results.map((note) => (
            <li key={note.id} className="flex items-start justify-between gap-3 rounded-md border border-line p-3">
              <div className="min-w-0">
                <p className="truncate text-body font-medium text-ink">{note.title || "（未命名筆記）"}</p>
                <p className="line-clamp-2 text-caption text-ink-muted">{excerpt(note.content, 100)}</p>
                <p className="mt-1 text-caption text-ink-faint">
                  刪除於 <time dateTime={note.updatedAt} className="tabular-nums">{formatDateTime(note.updatedAt)}</time>
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => restoreMutation.mutate({ id: note.id, patch: { deleted: false } })}
                loading={restoreMutation.isPending && restoreMutation.variables?.id === note.id}
              >
                復原
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
