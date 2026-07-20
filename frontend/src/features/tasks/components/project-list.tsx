"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, OfflineState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { useOnlineStatus } from "@/components/pwa/use-online-status";
import { newId } from "@/lib/resource";
import { useDeferredDelete } from "../hooks";
import { projectsRepo, tasksRepo } from "../repo";
import type { ProjectFormValues } from "../schema";
import type { Project } from "../types";

import { ProjectCard, newMilestoneId } from "./project-card";
import { ProjectFormSheet } from "./project-form-sheet";
import { UndoBar } from "./undo-bar";

export function ProjectListPage() {
  const online = useOnlineStatus();
  const projectsQuery = projectsRepo.useList({ pageSize: 200 });
  const tasksQuery = tasksRepo.useList({ pageSize: 500 });

  const { pending, scheduleDelete, undo } = useDeferredDelete<Project>("projects", (id) => projectsRepo.remove(id));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>(undefined);

  const projects = (projectsQuery.data?.results ?? []).filter((p) => p.id !== pending?.id);
  const tasks = tasksQuery.data?.results ?? [];
  const visibleProjects = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")), [projects]);

  const isLoading = projectsQuery.isLoading || tasksQuery.isLoading;
  const isError = projectsQuery.isError || tasksQuery.isError;

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setFormOpen(true);
  }

  async function handleSubmit(values: ProjectFormValues) {
    const payload: Partial<Project> = {
      name: values.name,
      description: values.description || null,
      status: values.status,
      color: values.color,
      startDate: values.startDate || null,
      targetDate: values.targetDate || null,
    };
    if (editing) {
      await projectsRepo.update(editing.id, payload);
    } else {
      await projectsRepo.create({ ...payload, id: newId(), progress: 0, milestones: [] });
    }
    setFormOpen(false);
  }

  async function handleAddMilestone(project: Project, title: string) {
    try {
      await projectsRepo.update(project.id, {
        milestones: [...project.milestones, { id: newMilestoneId(), title, dueDate: null, done: false }],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "新增里程碑失敗，請再試一次。");
    }
  }

  async function handleToggleMilestone(project: Project, milestoneId: string) {
    try {
      await projectsRepo.update(project.id, {
        milestones: project.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新里程碑失敗，請再試一次。");
    }
  }

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
        description="專案資料載入失敗，請檢查連線後重試。"
        onRetry={() => {
          void projectsQuery.refetch();
          void tasksQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!online ? <OfflineState /> : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-ink">專案</h1>
          <p className="mt-1 text-caption text-ink-muted">管理任務所屬的專案、里程碑與整體進度。</p>
        </div>
        <Button type="button" onClick={openCreate}>
          新增專案
        </Button>
      </div>

      {visibleProjects.length === 0 ? (
        <EmptyState
          title="尚未建立任何專案"
          description="建立專案後即可將任務分類，並自動依任務完成度推導進度。"
          action={
            <Button type="button" variant="secondary" onClick={openCreate}>
              新增專案
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={tasks}
              onEdit={openEdit}
              onDelete={(p) => scheduleDelete(p)}
              onAddMilestone={handleAddMilestone}
              onToggleMilestone={handleToggleMilestone}
            />
          ))}
        </div>
      )}

      <ProjectFormSheet open={formOpen} onClose={() => setFormOpen(false)} project={editing} onSubmit={handleSubmit} />

      {pending ? <UndoBar label={pending.label} onUndo={undo} /> : null}
    </div>
  );
}
