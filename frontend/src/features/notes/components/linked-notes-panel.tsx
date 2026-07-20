"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";

import { findBacklinks, resolveWikilinks } from "../wikilinks";
import type { Note } from "../types";

export interface LinkedNotesPanelProps {
  note: Note;
  allNotes: Note[];
  onNavigate: (noteId: string) => void;
  onCreateFromTitle: (title: string) => void;
}

/** 雙向連結面板：本篇連出去的 [[標題]]，以及其他筆記連進來的反向連結。 */
export function LinkedNotesPanel({ note, allNotes, onNavigate, onCreateFromTitle }: LinkedNotesPanelProps) {
  const outbound = useMemo(() => resolveWikilinks(note.content, allNotes), [note.content, allNotes]);
  const backlinks = useMemo(() => findBacklinks(note.title, allNotes, note.id), [note.title, allNotes, note.id]);

  if (outbound.length === 0 && backlinks.length === 0) {
    return (
      <p className="text-caption text-ink-muted">
        尚無雙向連結。在內容中輸入 <code className="rounded bg-paper-sunken px-1">[[筆記標題]]</code> 即可建立連結。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {outbound.length > 0 ? (
        <div>
          <p className="mb-1.5 text-label uppercase text-ink-muted">連出（本篇提及）</p>
          <ul className="flex flex-col gap-1">
            {outbound.map(({ title, note: target }) => (
              <li key={title} className="flex items-center justify-between gap-2">
                {target ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(target.id)}
                    className="truncate text-body text-accent underline underline-offset-2"
                  >
                    {title}
                  </button>
                ) : (
                  <>
                    <span className="truncate text-body text-ink-muted">{title}（尚未建立）</span>
                    <Button size="sm" variant="ghost" onClick={() => onCreateFromTitle(title)}>
                      建立
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {backlinks.length > 0 ? (
        <div>
          <p className="mb-1.5 text-label uppercase text-ink-muted">反向連結（提及本篇）</p>
          <ul className="flex flex-col gap-1">
            {backlinks.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(b.id)}
                  className="truncate text-body text-accent underline underline-offset-2"
                >
                  {b.title || "（未命名筆記）"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
