"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE } from "../constants";
import { isBlockedByDependencies } from "../dependency";
import type { Project, Task } from "../types";

export interface TaskRowProps {
  task: Task;
  project?: Project;
  tagNames: string[];
  tasksById: Map<string, Task>;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleComplete: (task: Task) => void;
  isTogglePending: boolean;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onSnooze: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return d.toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
}

export function TaskRow({
  task,
  project,
  tagNames,
  tasksById,
  selected,
  onToggleSelect,
  onToggleComplete,
  isTogglePending,
  onEdit,
  onDuplicate,
  onSnooze,
  onDelete,
}: TaskRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const blocked = isBlockedByDependencies(task, tasksById);
  const isDone = task.status === "completed";
  const due = formatDate(task.dueDate);
  const overdue = Boolean(task.dueDate) && !isDone && new Date(task.dueDate as string) < new Date(new Date().toDateString());

  return (
    <div
      className="group flex items-start gap-3 border-b border-line px-3 py-3 last:border-b-0 hover:bg-paper-sunken"
      data-task-id={task.id}
    >
      <input
        type="checkbox"
        aria-label={`選取「${task.title}」`}
        className="mt-1.5 h-4 w-4 rounded border-line-strong"
        checked={selected}
        onChange={() => onToggleSelect(task.id)}
      />

      <button
        type="button"
        aria-pressed={isDone}
        aria-label={isDone ? `將「${task.title}」標示為未完成` : `將「${task.title}」標示為完成`}
        onClick={() => onToggleComplete(task)}
        disabled={isTogglePending}
        className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-line-strong text-paper transition-colors disabled:opacity-50"
        style={isDone ? { backgroundColor: "var(--color-success)", borderColor: "var(--color-success)" } : undefined}
      >
        {isDone ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={isDone ? "text-body text-ink-muted line-through" : "text-body text-ink"}>
            {task.title}
          </span>
          <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
          <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
          {blocked ? <Badge tone="warning">等待相依任務</Badge> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-muted">
          {due ? (
            <span className={overdue ? "font-medium text-danger" : undefined}>
              {overdue ? "已逾期 " : "到期 "}
              {due}
            </span>
          ) : null}
          {project ? <span>專案：{project.name}</span> : null}
          {task.estimateMin ? <span className="tabular-nums">預估 {task.estimateMin} 分</span> : null}
          {task.parentId ? <span>子任務</span> : null}
          {tagNames.map((name) => (
            <span key={name} className="rounded-full bg-paper-sunken px-2 py-0.5">
              #{name}
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(task)}>
          編輯
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          更多
        </Button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-9 z-20 w-36 rounded-md border border-line bg-paper-raised p-1 shadow-md"
          >
            <button
              role="menuitem"
              type="button"
              className="block w-full rounded-sm px-2 py-1.5 text-left text-caption text-ink hover:bg-paper-sunken"
              onClick={() => {
                setMenuOpen(false);
                onSnooze(task);
              }}
            >
              延後一天
            </button>
            <button
              role="menuitem"
              type="button"
              className="block w-full rounded-sm px-2 py-1.5 text-left text-caption text-ink hover:bg-paper-sunken"
              onClick={() => {
                setMenuOpen(false);
                onDuplicate(task);
              }}
            >
              複製
            </button>
            <button
              role="menuitem"
              type="button"
              className="block w-full rounded-sm px-2 py-1.5 text-left text-caption text-danger hover:bg-danger-soft"
              onClick={() => {
                setMenuOpen(false);
                onDelete(task);
              }}
            >
              刪除
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
