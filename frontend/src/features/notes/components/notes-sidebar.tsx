"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { useNotesStore, type NotesView } from "../store";
import type { Note } from "../types";

export interface NotesSidebarProps {
  notes: Note[];
  trashCount: number;
  onNewNote: () => void;
  onOpenTrash: () => void;
  onOpenToday: () => void;
  className?: string;
}

const VIEW_ITEMS: { key: NotesView; label: string }[] = [
  { key: "all", label: "全部筆記" },
  { key: "favorites", label: "收藏" },
  { key: "daily", label: "每日筆記" },
];

export function NotesSidebar({ notes, trashCount, onNewNote, onOpenTrash, onOpenToday, className }: NotesSidebarProps) {
  const view = useNotesStore((s) => s.view);
  const filterFolder = useNotesStore((s) => s.filterFolder);
  const filterTag = useNotesStore((s) => s.filterTag);
  const setView = useNotesStore((s) => s.setView);
  const setFilterFolder = useNotesStore((s) => s.setFilterFolder);
  const setFilterTag = useNotesStore((s) => s.setFilterTag);

  const folders = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notes) {
      const key = note.folder.trim() || "未分類";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "zh-Hant"));
  }, [notes]);

  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notes) {
      for (const tag of note.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  return (
    <nav aria-label="筆記篩選" className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-2">
        <Button onClick={onNewNote} size="md">
          + 新增筆記
        </Button>
        <Button onClick={onOpenToday} variant="secondary" size="sm">
          今天的每日筆記
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-label uppercase text-ink-muted">檢視</span>
        {VIEW_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setView(item.key)}
            aria-current={view === item.key && !filterFolder && !filterTag ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-left text-body transition-colors",
              view === item.key && !filterFolder && !filterTag
                ? "bg-paper-sunken font-medium text-ink"
                : "text-ink-soft hover:bg-paper-sunken",
            )}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onOpenTrash}
          className="flex items-center justify-between rounded-md px-3 py-1.5 text-left text-body text-ink-soft transition-colors hover:bg-paper-sunken"
        >
          <span>垃圾桶</span>
          {trashCount > 0 ? (
            <Badge tone="neutral" withGlyph={false} className="tabular-nums">
              {trashCount}
            </Badge>
          ) : null}
        </button>
      </div>

      {folders.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-label uppercase text-ink-muted">資料夾</span>
          {folders.map(([folder, count]) => (
            <button
              key={folder}
              type="button"
              onClick={() => setFilterFolder(filterFolder === folder ? null : folder)}
              aria-current={filterFolder === folder ? "true" : undefined}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-1.5 text-left text-body transition-colors",
                filterFolder === folder ? "bg-paper-sunken font-medium text-ink" : "text-ink-soft hover:bg-paper-sunken",
              )}
            >
              <span className="truncate">{folder}</span>
              <span className="tabular-nums text-caption text-ink-muted">{count}</span>
            </button>
          ))}
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-label uppercase text-ink-muted">標籤</span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(([tag, count]) => (
              <button key={tag} type="button" onClick={() => setFilterTag(filterTag === tag ? null : tag)}>
                <Badge tone={filterTag === tag ? "accent" : "neutral"} withGlyph={false}>
                  {tag}
                  <span className="tabular-nums text-ink-faint">{count}</span>
                </Badge>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
