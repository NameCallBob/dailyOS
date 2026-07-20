"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { renderMarkdown } from "../markdown";
import { noteVersionsRepo, notesRepo } from "../repo";
import { useNotesStore } from "../store";
import type { Note, NoteFormValues, NoteVersion } from "../types";
import { formatDateTime, parseTagsInput, tagsToInput } from "../utils";
import { ConflictDialog } from "./conflict-dialog";
import { LinkedNotesPanel } from "./linked-notes-panel";
import { TagEditor } from "./tag-editor";
import { VersionHistorySheet } from "./version-history-sheet";

const formSchema = z.object({
  title: z.string().min(1, "請輸入標題").max(200, "標題過長"),
  content: z.string(),
  folder: z.string().max(200),
  tagsInput: z.string(),
  pinned: z.boolean(),
  projectName: z.string(),
  taskTitle: z.string(),
});

type EditorMode = "edit" | "preview" | "split";

export interface NoteEditorProps {
  noteId: string;
  allNotes: Note[];
  onNavigate: (noteId: string) => void;
  onCreateFromTitle: (title: string) => void;
  onDelete: (note: Note) => void;
}

interface ConflictState {
  server: Note;
  pendingPatch: Partial<Note>;
}

function formValuesFromNote(note: Note): NoteFormValues {
  return {
    title: note.title,
    content: note.content,
    folder: note.folder,
    tagsInput: tagsToInput(note.tags),
    pinned: note.pinned,
    projectName: note.projectName ?? "",
    taskTitle: note.taskTitle ?? "",
  };
}

export function NoteEditor({ noteId, allNotes, onNavigate, onCreateFromTitle, onDelete }: NoteEditorProps) {
  const noteQuery = notesRepo.useItem(noteId);
  const updateMutation = notesRepo.useUpdate();
  const createMutation = notesRepo.useCreate();
  const versionHistoryOpen = useNotesStore((s) => s.versionHistoryOpen);
  const setVersionHistoryOpen = useNotesStore((s) => s.setVersionHistoryOpen);

  const [editorMode, setEditorMode] = useState<EditorMode>("split");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [showLinks, setShowLinks] = useState(false);

  const baselineVersionRef = useRef<number | null>(null);
  const loadedNoteIdRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", content: "", folder: "", tagsInput: "", pinned: false, projectName: "", taskTitle: "" },
  });

  const note = noteQuery.data;

  // 切換到不同筆記（或首次載入）才重置表單，避免背景 refetch 蓋掉正在輸入的內容。
  useEffect(() => {
    if (note && loadedNoteIdRef.current !== note.id) {
      loadedNoteIdRef.current = note.id;
      baselineVersionRef.current = note.version;
      form.reset(formValuesFromNote(note));
      setLastSavedAt(note.updatedAt);
      setEditorMode("split");
    }
  }, [note, form]);

  async function snapshotVersion(source: Note, reason: NoteVersion["reason"]) {
    try {
      await noteVersionsRepo.create({
        noteId: source.id,
        title: source.title,
        content: source.content,
        folder: source.folder,
        tags: source.tags,
        reason,
        noteVersionAtSnapshot: source.version,
      });
    } catch {
      // 版本快照失敗不應阻擋主要儲存流程。
    }
  }

  function buildPatch(): Partial<Note> {
    const values = form.getValues();
    return {
      title: values.title.trim() || "未命名筆記",
      content: values.content,
      folder: values.folder.trim(),
      tags: parseTagsInput(values.tagsInput),
      pinned: values.pinned,
      projectName: values.projectName.trim() || undefined,
      taskTitle: values.taskTitle.trim() || undefined,
    };
  }

  function hasChanges(patch: Partial<Note>, against: Note): boolean {
    return (
      patch.title !== against.title ||
      patch.content !== against.content ||
      patch.folder !== against.folder ||
      patch.pinned !== against.pinned ||
      JSON.stringify(patch.tags) !== JSON.stringify(against.tags) ||
      (patch.projectName ?? "") !== (against.projectName ?? "") ||
      (patch.taskTitle ?? "") !== (against.taskTitle ?? "")
    );
  }

  async function performSave(trigger: "auto" | "manual") {
    if (!note) return;
    const patch = buildPatch();
    if (!hasChanges(patch, note)) return;

    let fresh: Note;
    try {
      fresh = await notesRepo.get(note.id);
    } catch {
      if (trigger === "manual") toast.error("儲存失敗，請確認網路連線後再試一次。");
      return;
    }

    if (baselineVersionRef.current !== null && fresh.version !== baselineVersionRef.current) {
      // 衝突：不得無聲覆蓋，交由使用者決定。
      setConflict({ server: fresh, pendingPatch: patch });
      return;
    }

    await snapshotVersion(fresh, trigger === "manual" ? "manual_save" : "auto_snapshot");

    updateMutation.mutate(
      { id: note.id, patch },
      {
        onSuccess: (updated) => {
          baselineVersionRef.current = updated.version;
          setLastSavedAt(updated.updatedAt);
          if (trigger === "manual") toast.success("筆記已儲存。");
        },
      },
    );
  }

  // 自動儲存：輸入停止 1.5 秒後觸發。
  useEffect(() => {
    const subscription = form.watch(() => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        void performSave("auto");
      }, 1500);
    });
    return () => {
      subscription.unsubscribe();
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, note?.id]);

  // Ctrl/Cmd+S 手動儲存
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void performSave("manual");
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function handleKeepMineOverwrite() {
    if (!conflict || !note) return;
    const { server, pendingPatch } = conflict;
    void (async () => {
      await snapshotVersion(server, "conflict_branch");
      updateMutation.mutate(
        { id: note.id, patch: pendingPatch },
        {
          onSuccess: (updated) => {
            baselineVersionRef.current = updated.version;
            setLastSavedAt(updated.updatedAt);
            toast.success("已以你的版本覆蓋，衝突前的版本已保留在歷史紀錄中。");
          },
        },
      );
    })();
    setConflict(null);
  }

  function handleDiscardMineReload() {
    if (!conflict) return;
    const { server } = conflict;
    baselineVersionRef.current = server.version;
    form.reset(formValuesFromNote(server));
    toast.info("已載入最新版本，你的變更未儲存。");
    setConflict(null);
  }

  function handleSaveAsCopy() {
    if (!conflict || !note) return;
    const { pendingPatch } = conflict;
    createMutation.mutate(
      {
        title: `${pendingPatch.title ?? note.title}（副本）`,
        content: pendingPatch.content ?? note.content,
        folder: pendingPatch.folder ?? note.folder,
        tags: pendingPatch.tags ?? note.tags,
        pinned: false,
        isDaily: false,
        projectName: pendingPatch.projectName,
        taskTitle: pendingPatch.taskTitle,
      },
      {
        onSuccess: (created) => {
          toast.success("已將你的變更另存為新筆記。");
          onNavigate(created.id);
        },
      },
    );
    setConflict(null);
  }

  function handleRestoreVersion(version: NoteVersion) {
    if (!note) return;
    void (async () => {
      await snapshotVersion(note, "auto_snapshot");
      updateMutation.mutate(
        {
          id: note.id,
          patch: { title: version.title, content: version.content, folder: version.folder, tags: version.tags },
        },
        {
          onSuccess: (updated) => {
            baselineVersionRef.current = updated.version;
            setLastSavedAt(updated.updatedAt);
            form.reset(formValuesFromNote(updated));
            toast.success("已還原至所選版本。");
          },
        },
      );
    })();
    setVersionHistoryOpen(false);
  }

  function handleExport() {
    if (!note) return;
    const values = form.getValues();
    const tags = parseTagsInput(values.tagsInput);
    const frontMatter = [
      "---",
      `title: ${values.title}`,
      `folder: ${values.folder || "未分類"}`,
      `tags: [${tags.join(", ")}]`,
      `createdAt: ${note.createdAt}`,
      `updatedAt: ${note.updatedAt}`,
      "---",
      "",
    ].join("\n");
    const blob = new Blob([frontMatter + values.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${values.title || "note"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("已匯出 Markdown 檔案。");
  }

  function handlePreviewClick(e: MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-wikilink]");
    if (!target) return;
    const title = target.dataset.wikilink;
    if (!title) return;
    const existing = allNotes.find((n) => !n.deleted && n.title.trim().toLowerCase() === title.toLowerCase());
    if (existing) onNavigate(existing.id);
    else onCreateFromTitle(title);
  }

  if (noteQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (noteQuery.isError || !note) {
    return (
      <ErrorState
        title="筆記載入失敗"
        description="這篇筆記可能已被刪除，或發生連線問題。"
        onRetry={() => noteQuery.refetch()}
      />
    );
  }

  const previewHtml = renderMarkdown(form.watch("content"));
  const pinned = form.watch("pinned");

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {note.isDaily ? <Badge tone="accent">每日筆記 {note.dailyDate}</Badge> : null}
          {note.projectName ? <Badge tone="neutral">專案：{note.projectName}</Badge> : null}
          {note.taskTitle ? <Badge tone="neutral">任務：{note.taskTitle}</Badge> : null}
          <span className="ml-auto text-caption text-ink-faint">
            {updateMutation.isPending ? "儲存中…" : lastSavedAt ? `已儲存 ${formatDateTime(lastSavedAt)}` : ""}
          </span>
        </div>

        <Input
          value={form.watch("title")}
          onChange={(e) => form.setValue("title", e.target.value, { shouldDirty: true })}
          onBlur={() => void performSave("auto")}
          placeholder="筆記標題"
          error={form.formState.errors.title?.message}
          className="text-h2 h-auto py-2"
          aria-label="筆記標題"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={form.watch("folder")}
            onChange={(e) => form.setValue("folder", e.target.value, { shouldDirty: true })}
            onBlur={() => void performSave("auto")}
            placeholder="資料夾（例如 工作/專案A）"
            className="h-8 w-56"
            aria-label="資料夾"
          />
          <button
            type="button"
            onClick={() => {
              form.setValue("pinned", !pinned, { shouldDirty: true });
              void performSave("auto");
            }}
            aria-pressed={pinned}
            className="flex items-center gap-1 rounded-md border border-line-strong px-2.5 py-1 text-caption text-ink-soft hover:bg-paper-sunken"
          >
            <span aria-hidden>{pinned ? "★" : "☆"}</span>
            {pinned ? "已收藏" : "收藏"}
          </button>
          <Input
            value={form.watch("projectName")}
            onChange={(e) => form.setValue("projectName", e.target.value, { shouldDirty: true })}
            onBlur={() => void performSave("auto")}
            placeholder="關聯專案（選填）"
            className="h-8 w-40"
            aria-label="關聯專案"
          />
          <Input
            value={form.watch("taskTitle")}
            onChange={(e) => form.setValue("taskTitle", e.target.value, { shouldDirty: true })}
            onBlur={() => void performSave("auto")}
            placeholder="關聯任務（選填）"
            className="h-8 w-40"
            aria-label="關聯任務"
          />
        </div>

        <TagEditor
          value={parseTagsInput(form.watch("tagsInput"))}
          onChange={(tags) => {
            form.setValue("tagsInput", tagsToInput(tags), { shouldDirty: true });
            void performSave("auto");
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <Segmented
            label="檢視模式"
            value={editorMode}
            onChange={(v) => setEditorMode(v as EditorMode)}
            options={[
              { value: "edit", label: "編輯" },
              { value: "split", label: "分割" },
              { value: "preview", label: "預覽" },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowLinks((v) => !v)}>
              {showLinks ? "隱藏連結" : "雙向連結"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setVersionHistoryOpen(true)}>
              版本紀錄
            </Button>
            <Button size="sm" variant="secondary" onClick={handleExport}>
              匯出 Markdown
            </Button>
            <Button size="sm" variant="primary" onClick={() => void performSave("manual")} loading={updateMutation.isPending}>
              儲存
            </Button>
            <Button size="sm" variant="danger" onClick={() => onDelete(note)}>
              刪除
            </Button>
          </div>
        </div>
      </header>

      {showLinks ? (
        <div className="rounded-md border border-line bg-paper-sunken p-3">
          <LinkedNotesPanel note={note} allNotes={allNotes} onNavigate={onNavigate} onCreateFromTitle={onCreateFromTitle} />
        </div>
      ) : null}

      <div
        className={
          editorMode === "split"
            ? "grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2"
            : "flex-1 overflow-hidden"
        }
      >
        {editorMode !== "preview" ? (
          <Textarea
            value={form.watch("content")}
            onChange={(e) => form.setValue("content", e.target.value, { shouldDirty: true })}
            placeholder="以 Markdown 撰寫內容，支援 # 標題、**粗體**、``` 程式碼區塊、[[雙向連結]]…"
            className="h-full min-h-[320px] resize-none font-mono text-body leading-relaxed"
            aria-label="筆記內容（Markdown）"
          />
        ) : null}
        {editorMode !== "edit" ? (
          <div
            ref={previewRef}
            onClick={handlePreviewClick}
            className="h-full min-h-[320px] overflow-y-auto rounded-md border border-line bg-paper-raised p-4"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : null}
      </div>

      <VersionHistorySheet
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        noteId={note.id}
        noteTitle={note.title}
        onRestore={handleRestoreVersion}
      />

      <ConflictDialog
        open={conflict !== null}
        localTitle={conflict?.pendingPatch.title ?? ""}
        serverTitle={conflict?.server.title ?? ""}
        serverUpdatedAt={conflict?.server.updatedAt ?? ""}
        onKeepMineOverwrite={handleKeepMineOverwrite}
        onDiscardMineReload={handleDiscardMineReload}
        onSaveAsCopy={handleSaveAsCopy}
        onClose={() => setConflict(null)}
      />
    </div>
  );
}
