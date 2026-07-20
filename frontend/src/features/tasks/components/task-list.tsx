"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, OfflineState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";

import { matchesFilters, matchesView, sortTasks } from "../filters";
import {
  useDeferredDelete,
  useTaskBatchActions,
  useTaskDuplicate,
  useTaskQuickComplete,
  useTaskSnooze,
} from "../hooks";
import { useOnlineStatus } from "@/components/pwa/use-online-status";
import { newId, nowIso } from "@/lib/resource";
import { projectsRepo, tagsRepo, tasksRepo } from "../repo";
import { BUILTIN_TEMPLATES, useTasksStore } from "../store";
import type { Task, TaskStatus } from "../types";

import { BulkToolbar } from "./bulk-toolbar";
import { FiltersBar } from "./filters-bar";
import { TaskBoard } from "./task-board";
import { TaskFormSheet } from "./task-form-sheet";
import { TaskRow } from "./task-row";
import { TemplatePicker } from "./template-picker";
import { UndoBar } from "./undo-bar";
import { ViewTabs } from "./view-tabs";
import type { TaskFormValues } from "../schema";
import type { TaskTemplate } from "../store";

export function TaskListPage() {
  const online = useOnlineStatus();
  const tasksQuery = tasksRepo.useList({ pageSize: 500 });
  const projectsQuery = projectsRepo.useList({ pageSize: 200 });
  const tagsQuery = tagsRepo.useList({ pageSize: 200 });

  const { view, layout, filters, selectedIds, setView, setLayout, setFilters, resetFilters, toggleSelected, selectMany, clearSelection, customTemplates } =
    useTasksStore();

  const { toggleComplete, isPending } = useTaskQuickComplete();
  const snooze = useTaskSnooze();
  const duplicate = useTaskDuplicate();
  const { batchComplete, batchSetStatus, batchDelete } = useTaskBatchActions();
  const { pending: pendingDeletion, scheduleDelete, undo } = useDeferredDelete<Task>("tasks", (id) => tasksRepo.remove(id));

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [formDefaults, setFormDefaults] = useState<Partial<TaskFormValues> | undefined>(undefined);

  const tasks = useMemo(() => tasksQuery.data?.results ?? [], [tasksQuery.data]);
  const projects = useMemo(() => projectsQuery.data?.results ?? [], [projectsQuery.data]);
  const tags = useMemo(() => tagsQuery.data?.results ?? [], [tagsQuery.data]);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t.name])), [tags]);

  const visibleTasks = useMemo(() => {
    const filtered = tasks
      .filter((t) => t.id !== pendingDeletion?.id)
      .filter((t) => matchesView(t, view))
      .filter((t) => matchesFilters(t, filters));
    return sortTasks(filtered);
  }, [tasks, view, filters, pendingDeletion]);

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading || tagsQuery.isLoading;
  const isError = tasksQuery.isError || projectsQuery.isError || tagsQuery.isError;

  function openCreate(defaults?: Partial<TaskFormValues>) {
    setEditingTask(undefined);
    setFormDefaults(defaults);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormDefaults(undefined);
    setFormOpen(true);
  }

  function applyTemplate(template: TaskTemplate) {
    openCreate({
      title: template.title,
      description: template.description,
      priority: template.priority,
      estimateMin: template.estimateMin ? String(template.estimateMin) : undefined,
      energy: template.energy,
      context: template.context,
    });
  }

  async function handleSubmit(values: TaskFormValues & { tagIds: string[]; dependsOn: string[] }) {
    const payload: Partial<Task> = {
      title: values.title,
      description: values.description || null,
      status: values.status,
      priority: values.priority,
      projectId: values.projectId || null,
      tags: values.tagIds,
      dueDate: values.dueDate || null,
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
      estimateMin: values.estimateMin ? Number(values.estimateMin) : null,
      energy: values.energy || null,
      context: values.context || null,
      recurrenceRule: values.recurrenceRule || null,
      parentId: values.parentId || null,
      dependsOn: values.dependsOn,
      remindAt: values.remindAt ? new Date(values.remindAt).toISOString() : null,
    };
    if (editingTask) {
      await tasksRepo.update(editingTask.id, payload);
    } else {
      await tasksRepo.create({
        ...payload,
        id: newId(),
        actualMin: null,
        completedAt: null,
        archived: false,
      });
    }
    setFormOpen(false);
  }

  function handleMoveStatus(task: Task, status: TaskStatus) {
    void tasksRepo.update(task.id, {
      status,
      completedAt: status === "completed" ? nowIso() : task.completedAt,
    });
  }

  const allVisibleSelected = visibleTasks.length > 0 && visibleTasks.every((t) => selectedIds.includes(t.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description="任務資料載入失敗，請檢查連線後重試。"
        onRetry={() => {
          void tasksQuery.refetch();
          void projectsQuery.refetch();
          void tagsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!online ? <OfflineState /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewTabs view={view} layout={layout} onViewChange={setView} onLayoutChange={setLayout} />
        <Button type="button" onClick={() => openCreate()}>
          新增任務
        </Button>
      </div>

      <TemplatePicker templates={[...BUILTIN_TEMPLATES, ...customTemplates]} onPick={applyTemplate} />

      <FiltersBar filters={filters} onChange={setFilters} onReset={resetFilters} projects={projects} tags={tags} />

      <BulkToolbar
        count={selectedIds.length}
        onComplete={() => {
          void batchComplete(selectedIds);
          clearSelection();
        }}
        onArchive={() => {
          void batchSetStatus(selectedIds, "archived");
          clearSelection();
        }}
        onDelete={() => {
          void batchDelete(selectedIds);
          clearSelection();
        }}
        onClear={clearSelection}
      />

      {visibleTasks.length === 0 ? (
        <EmptyState
          title="沒有符合條件的任務"
          description="試試切換檢視、清除篩選，或新增一筆任務。"
          action={
            <Button type="button" variant="secondary" onClick={() => openCreate()}>
              新增任務
            </Button>
          }
        />
      ) : layout === "board" ? (
        <TaskBoard tasks={visibleTasks} projectsById={projectsById} onMoveStatus={handleMoveStatus} onEdit={openEdit} />
      ) : (
        <div className="rounded-lg border border-line bg-paper-raised">
          <div className="flex items-center gap-3 border-b border-line px-3 py-2">
            <input
              type="checkbox"
              aria-label="全選目前檢視的任務"
              className="h-4 w-4 rounded border-line-strong"
              checked={allVisibleSelected}
              onChange={() => (allVisibleSelected ? clearSelection() : selectMany(visibleTasks.map((t) => t.id)))}
            />
            <span className="text-caption text-ink-muted">全選（{visibleTasks.length} 筆）</span>
          </div>
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              project={task.projectId ? projectsById.get(task.projectId) : undefined}
              tagNames={task.tags.map((id) => tagsById.get(id)).filter((v): v is string => Boolean(v))}
              tasksById={tasksById}
              selected={selectedIds.includes(task.id)}
              onToggleSelect={toggleSelected}
              onToggleComplete={toggleComplete}
              isTogglePending={isPending(task.id)}
              onEdit={openEdit}
              onDuplicate={(t) => void duplicate(t)}
              onSnooze={(t) => void snooze(t, { days: 1 })}
              onDelete={(t) => scheduleDelete(t)}
            />
          ))}
        </div>
      )}

      <TaskFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={editingTask}
        tasks={tasks}
        projects={projects}
        tags={tags}
        defaultValues={formDefaults}
        onSubmit={handleSubmit}
      />

      {pendingDeletion ? <UndoBar label={pendingDeletion.label} onUndo={undo} /> : null}
    </div>
  );
}
