"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

import type { NoteSearchHit } from "../search";
import { excerpt, formatDateTime } from "../utils";

export interface NoteListProps {
  hits: NoteSearchHit[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function NoteList({ hits, selectedId, onSelect, emptyTitle, emptyDescription, className }: NoteListProps) {
  if (hits.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? "沒有符合的筆記"}
        description={emptyDescription ?? "試試調整篩選條件，或建立第一篇筆記。"}
        className={className}
      />
    );
  }

  return (
    <ul className={cn("flex flex-col gap-1", className)} aria-label="筆記清單">
      {hits.map(({ note, snippet, matchField }) => {
        const selected = note.id === selectedId;
        return (
          <li key={note.id}>
            <button
              type="button"
              onClick={() => onSelect(note.id)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex w-full flex-col gap-1 rounded-md border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-ink bg-paper-sunken"
                  : "border-transparent hover:border-line hover:bg-paper-sunken/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-body font-medium text-ink">{note.title || "（未命名筆記）"}</span>
                {note.pinned ? (
                  <span aria-label="已收藏" title="已收藏" className="shrink-0 text-caption text-accent">
                    ★
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-caption text-ink-muted">
                {matchField === "content" || matchField === "title" ? snippet || excerpt(note.content) : excerpt(note.content)}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-caption text-ink-faint">
                <time dateTime={note.updatedAt} className="tabular-nums">
                  {formatDateTime(note.updatedAt)}
                </time>
                {note.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} tone="neutral" withGlyph={false} className="text-[0.65rem]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
