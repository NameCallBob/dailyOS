"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "../constants";
import { computeProjectProgress } from "../filters";
import { newId } from "@/lib/resource";
import type { Project, Task } from "../types";

export interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onAddMilestone: (project: Project, title: string) => void;
  onToggleMilestone: (project: Project, milestoneId: string) => void;
}

export function ProjectCard({ project, tasks, onEdit, onDelete, onAddMilestone, onToggleMilestone }: ProjectCardProps) {
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const progress = computeProjectProgress(project, tasks);
  const taskCount = tasks.filter((t) => t.projectId === project.id).length;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-1 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h3 className="text-h3 text-ink">{project.name}</h3>
            {project.description ? <p className="mt-0.5 text-caption text-ink-muted">{project.description}</p> : null}
          </div>
        </div>
        <Badge tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABEL[project.status]}</Badge>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-caption text-ink-muted">
          <span>進度（依任務推導）</span>
          <span className="tabular-nums">
            {progress}% · {taskCount} 項任務
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${project.name} 進度`}
          className="h-2 overflow-hidden rounded-full bg-paper-sunken"
        >
          <div
            className="h-full rounded-full transition-[width] motion-reduce:transition-none"
            style={{ width: `${progress}%`, backgroundColor: project.color }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-muted">
        {project.startDate ? <span>開始 {project.startDate}</span> : null}
        {project.targetDate ? <span>目標 {project.targetDate}</span> : null}
      </div>

      {project.milestones.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {project.milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-caption">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-line-strong"
                checked={m.done}
                onChange={() => onToggleMilestone(project, m.id)}
                aria-label={`里程碑：${m.title}`}
              />
              <span className={m.done ? "text-ink-muted line-through" : "text-ink-soft"}>{m.title}</span>
              {m.dueDate ? <span className="ml-auto tabular-nums text-ink-faint">{m.dueDate}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!milestoneTitle.trim()) return;
          onAddMilestone(project, milestoneTitle.trim());
          setMilestoneTitle("");
        }}
      >
        <div className="flex-1">
          <Input
            aria-label="新增里程碑"
            placeholder="新增里程碑…"
            value={milestoneTitle}
            onChange={(e) => setMilestoneTitle(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" variant="secondary">
          新增
        </Button>
      </form>

      <div className="mt-1 flex justify-end gap-2 border-t border-line pt-3">
        <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(project)}>
          編輯
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={() => onDelete(project)}>
          刪除
        </Button>
      </div>
    </div>
  );
}

export function newMilestoneId(): string {
  return newId();
}
