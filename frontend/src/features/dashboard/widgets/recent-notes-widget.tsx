"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { formatDateLabel } from "../date-utils";
import { notesResource } from "../resources";

export function RecentNotesWidget() {
  const { data, isLoading, isError, refetch } = notesResource.useList();

  const notes = (data?.results ?? [])
    .slice()
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>最近筆記</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState description="筆記載入失敗。" onRetry={() => refetch()} />
        ) : notes.length === 0 ? (
          <EmptyState title="還沒有任何筆記" description="用快速新增或「筆記」模組寫下第一篇。" />
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((note) => (
              <li key={note.id} className="flex flex-col gap-1 border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  {note.pinned ? <Badge tone="accent">釘選</Badge> : null}
                  <p className="text-body text-ink">{note.title}</p>
                </div>
                <p className="line-clamp-1 text-caption text-ink-muted">{note.content}</p>
                <span className="text-label text-ink-faint">{formatDateLabel(note.updatedAt.slice(0, 10))}更新</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
