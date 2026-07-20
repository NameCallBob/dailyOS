"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, OfflineState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { useOnlineStatus } from "@/components/pwa/use-online-status";
import { notesRepo } from "../repo";
import { searchNotes } from "../search";
import { useNotesStore } from "../store";
import type { Note } from "../types";
import { dailyNoteTitleFor, todayDateStr } from "../utils";
import { NoteEditor } from "./note-editor";
import { NoteList } from "./note-list";
import { NotesSidebar } from "./notes-sidebar";
import { TrashSheet } from "./trash-sheet";
import { UndoBanner } from "./undo-banner";

function blankNotePayload(overrides: Partial<Note> = {}): Partial<Note> {
  return {
    title: "未命名筆記",
    content: "",
    folder: "",
    tags: [],
    pinned: false,
    isDaily: false,
    ...overrides,
  };
}

export function NotesView() {
  const notesQuery = notesRepo.useList({ pageSize: 500, ordering: "-updatedAt" });
  const trashQuery = notesRepo.useList({ filters: { deleted: true }, pageSize: 500 });
  const createMutation = notesRepo.useCreate();
  const removeMutation = notesRepo.useRemove();
  const updateMutation = notesRepo.useUpdate();
  const isOnline = useOnlineStatus();

  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const selectNote = useNotesStore((s) => s.selectNote);
  const view = useNotesStore((s) => s.view);
  const filterFolder = useNotesStore((s) => s.filterFolder);
  const filterTag = useNotesStore((s) => s.filterTag);
  const searchQuery = useNotesStore((s) => s.searchQuery);
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery);
  const mobileDetailOpen = useNotesStore((s) => s.mobileDetailOpen);
  const setMobileDetailOpen = useNotesStore((s) => s.setMobileDetailOpen);
  const trashOpen = useNotesStore((s) => s.trashOpen);
  const setTrashOpen = useNotesStore((s) => s.setTrashOpen);

  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

  const allNotes = useMemo(() => notesQuery.data?.results ?? [], [notesQuery.data]);

  const scoped = useMemo(() => {
    let list = allNotes;
    if (view === "favorites") list = list.filter((n) => n.pinned);
    if (view === "daily") list = list.filter((n) => n.isDaily);
    if (filterFolder) list = list.filter((n) => (n.folder.trim() || "未分類") === filterFolder);
    if (filterTag) list = list.filter((n) => n.tags.includes(filterTag));
    return list;
  }, [allNotes, view, filterFolder, filterTag]);

  const hits = useMemo(() => searchNotes(scoped, searchQuery), [scoped, searchQuery]);

  const trashCount = trashQuery.data?.count ?? 0;

  function handleNewNote() {
    createMutation.mutate(blankNotePayload(), {
      onSuccess: (created) => {
        selectNote(created.id);
        toast.success("已建立新筆記。");
      },
    });
  }

  function handleOpenToday() {
    const today = todayDateStr();
    const existing = allNotes.find((n) => n.isDaily && n.dailyDate === today);
    if (existing) {
      selectNote(existing.id);
      return;
    }
    createMutation.mutate(
      blankNotePayload({
        title: dailyNoteTitleFor(today),
        content: `# ${dailyNoteTitleFor(today)}\n\n## 待辦\n- \n\n## 筆記\n`,
        folder: "每日筆記",
        tags: ["每日筆記"],
        isDaily: true,
        dailyDate: today,
      }),
      {
        onSuccess: (created) => {
          selectNote(created.id);
          toast.success("已建立今天的每日筆記。");
        },
      },
    );
  }

  function handleCreateFromTitle(title: string) {
    createMutation.mutate(blankNotePayload({ title, content: `# ${title}\n\n` }), {
      onSuccess: (created) => {
        selectNote(created.id);
        toast.success(`已建立筆記「${title}」。`);
      },
    });
  }

  function handleRequestDelete(note: Note) {
    removeMutation.mutate(note.id, {
      onSuccess: () => {
        setPendingDelete(note);
        selectNote(null);
      },
    });
  }

  function handleUndoDelete() {
    if (!pendingDelete) return;
    updateMutation.mutate(
      { id: pendingDelete.id, patch: { deleted: false } },
      {
        onSuccess: () => {
          selectNote(pendingDelete.id);
          toast.success("已復原筆記。");
        },
      },
    );
    setPendingDelete(null);
  }

  const selectedNote = selectedNoteId ? (allNotes.find((n) => n.id === selectedNoteId) ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">筆記</h1>
        <p className="text-caption text-ink-muted">Markdown 筆記、雙向連結、版本紀錄與每日筆記。</p>
      </header>

      {!isOnline ? <OfflineState /> : null}

      {notesQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : notesQuery.isError ? (
        <ErrorState description="筆記載入失敗，請稍後再試一次。" onRetry={() => notesQuery.refetch()} />
      ) : allNotes.length === 0 ? (
        <EmptyState
          title="尚無筆記"
          description="建立第一篇筆記，開始記錄想法。"
          action={
            <Button onClick={handleNewNote} loading={createMutation.isPending}>
              + 新增筆記
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_320px_1fr] lg:items-start">
          <NotesSidebar
            notes={allNotes}
            trashCount={trashCount}
            onNewNote={handleNewNote}
            onOpenTrash={() => setTrashOpen(true)}
            onOpenToday={handleOpenToday}
            className="hidden lg:flex"
          />

          <div className={mobileDetailOpen ? "hidden lg:flex lg:flex-col lg:gap-3" : "flex flex-col gap-3"}>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋標題、內容、標籤…"
              aria-label="搜尋筆記"
            />
            <div className="lg:hidden">
              <NotesSidebarMobileControls
                notes={allNotes}
                trashCount={trashCount}
                onNewNote={handleNewNote}
                onOpenTrash={() => setTrashOpen(true)}
                onOpenToday={handleOpenToday}
              />
            </div>
            <NoteList hits={hits} selectedId={selectedNoteId} onSelect={(id) => selectNote(id)} />
          </div>

          <div className={mobileDetailOpen ? "flex flex-col gap-2" : "hidden lg:flex lg:flex-col lg:gap-2"}>
            {mobileDetailOpen ? (
              <Button variant="ghost" size="sm" className="self-start lg:hidden" onClick={() => setMobileDetailOpen(false)}>
                ← 回列表
              </Button>
            ) : null}
            {selectedNote ? (
              <NoteEditor
                noteId={selectedNote.id}
                allNotes={allNotes}
                onNavigate={(id) => selectNote(id)}
                onCreateFromTitle={handleCreateFromTitle}
                onDelete={handleRequestDelete}
              />
            ) : (
              <EmptyState title="選擇一篇筆記" description="從左側清單選取筆記，或建立新筆記開始撰寫。" />
            )}
          </div>
        </div>
      )}

      {pendingDelete ? (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md sm:right-6 sm:left-auto">
          <UndoBanner
            message={`已刪除「${pendingDelete.title}」`}
            onUndo={handleUndoDelete}
            onExpire={() => setPendingDelete(null)}
          />
        </div>
      ) : null}

      <TrashSheet open={trashOpen} onClose={() => setTrashOpen(false)} />
    </div>
  );
}

function NotesSidebarMobileControls(props: {
  notes: Note[];
  trashCount: number;
  onNewNote: () => void;
  onOpenTrash: () => void;
  onOpenToday: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={props.onNewNote}>
        + 新增
      </Button>
      <Button size="sm" variant="secondary" onClick={props.onOpenToday}>
        今日筆記
      </Button>
      <Button size="sm" variant="secondary" onClick={props.onOpenTrash}>
        垃圾桶
      </Button>
    </div>
  );
}
