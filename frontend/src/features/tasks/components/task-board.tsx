"use client";

import { useState, type DragEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

import { BOARD_COLUMNS, PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL } from "../constants";
import type { Project, Task, TaskStatus } from "../types";

export interface TaskBoardProps {
  tasks: Task[];
  projectsById: Map<string, Project>;
  onMoveStatus: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
}

/**
 * 看板檢視：依 status 分欄。滑鼠可拖曳卡片變更狀態；
 * 每張卡片同時提供「狀態」下拉選單作為鍵盤可操作的替代方式（WCAG 2.1.1）。
 */
export function TaskBoard({ tasks, projectsById, onMoveStatus, onEdit }: TaskBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const columns = BOARD_COLUMNS.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status),
  }));

  function handleDrop(status: TaskStatus, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOverColumn(null);
    const taskId = event.dataTransfer.getData("text/plain") || draggingId;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== status) onMoveStatus(task, status);
    setDraggingId(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map(({ status, items }) => (
        <div
          key={status}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverColumn(status);
          }}
          onDragLeave={() => setDragOverColumn((c) => (c === status ? null : c))}
          onDrop={(e) => handleDrop(status, e)}
          className={`flex w-72 shrink-0 flex-col gap-2 rounded-lg border p-2 ${
            dragOverColumn === status ? "border-accent bg-accent-soft/40" : "border-line bg-paper-sunken"
          }`}
        >
          <div className="flex items-center justify-between px-1 py-1">
            <h3 className="text-label uppercase text-ink-muted">{STATUS_LABEL[status]}</h3>
            <span className="text-caption tabular-nums text-ink-faint">{items.length}</span>
          </div>
          <div className="flex min-h-16 flex-col gap-2">
            {items.length === 0 ? (
              <p className="rounded-md border border-dashed border-line-strong px-2 py-4 text-center text-caption text-ink-faint">
                無任務
              </p>
            ) : null}
            {items.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", task.id);
                  setDraggingId(task.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                className="cursor-grab rounded-md border border-line bg-paper-raised p-3 shadow-sm active:cursor-grabbing"
              >
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="block w-full text-left text-body text-ink hover:underline"
                >
                  {task.title}
                </button>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
                  {task.projectId && projectsById.get(task.projectId) ? (
                    <span className="text-caption text-ink-muted">{projectsById.get(task.projectId)?.name}</span>
                  ) : null}
                  {task.dueDate ? (
                    <span className="text-caption tabular-nums text-ink-muted">
                      {new Date(task.dueDate).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2">
                  <label className="sr-only" htmlFor={`move-${task.id}`}>
                    移動「{task.title}」至狀態
                  </label>
                  <Select
                    id={`move-${task.id}`}
                    aria-label={`移動「${task.title}」至狀態（鍵盤可操作的拖曳替代方式）`}
                    value={task.status}
                    onChange={(e) => onMoveStatus(task, e.target.value as TaskStatus)}
                    options={BOARD_COLUMNS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                    className="h-8 text-caption"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
