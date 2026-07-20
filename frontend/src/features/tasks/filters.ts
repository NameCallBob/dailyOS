/**
 * features/tasks/filters.ts — 純函式：檢視分類（Today/Upcoming/Inbox/All/Completed）、
 * 篩選與排序、專案進度推導。純函式方便測試，不依賴 React。
 */

import type { TaskFilters } from "./store";
import type { Project, Task, TaskView } from "./types";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = startOfToday();
  d.setHours(23, 59, 59, 999);
  return d;
}

function isSameOrBefore(dateStr: string, boundary: Date): boolean {
  const d = new Date(dateStr);
  return d.getTime() <= boundary.getTime();
}

/** 任務是否落在「今天」：due date 為今日或已逾期，或排程時間在今天內。 */
export function isTodayTask(task: Task): boolean {
  if (task.status === "completed" || task.status === "cancelled" || task.status === "archived") return false;
  const today = endOfToday();
  if (task.dueDate && isSameOrBefore(task.dueDate, today)) return true;
  if (task.scheduledAt && isSameOrBefore(task.scheduledAt, today)) return true;
  return false;
}

/** 「即將到來」：有到期日/排程但不在今天範圍內的未完成任務。 */
export function isUpcomingTask(task: Task): boolean {
  if (task.status === "completed" || task.status === "cancelled" || task.status === "archived") return false;
  const today = endOfToday();
  const dueLater = task.dueDate ? new Date(task.dueDate).getTime() > today.getTime() : false;
  const scheduledLater = task.scheduledAt ? new Date(task.scheduledAt).getTime() > today.getTime() : false;
  return dueLater || scheduledLater;
}

export function isInboxTask(task: Task): boolean {
  return task.status === "inbox";
}

export function isCompletedTask(task: Task): boolean {
  return task.status === "completed";
}

export function matchesView(task: Task, view: TaskView): boolean {
  switch (view) {
    case "today":
      return isTodayTask(task);
    case "upcoming":
      return isUpcomingTask(task);
    case "inbox":
      return isInboxTask(task);
    case "completed":
      return isCompletedTask(task);
    case "all":
    default:
      return task.status !== "archived";
  }
}

export function matchesFilters(task: Task, filters: TaskFilters): boolean {
  if (filters.projectId !== "all" && task.projectId !== filters.projectId) return false;
  if (filters.tag !== "all" && !task.tags.includes(filters.tag)) return false;
  if (filters.priority !== "all" && task.priority !== filters.priority) return false;
  if (filters.energy !== "all" && task.energy !== filters.energy) return false;
  if (filters.search.trim()) {
    const needle = filters.search.trim().toLowerCase();
    const haystack = `${task.title} ${task.description ?? ""} ${task.context ?? ""}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

/** 排序：先依優先權（高到低），再依到期日（早到晚，無到期日排最後）。 */
const PRIORITY_ORDER: Record<Task["priority"], number> = { urgent: 0, high: 1, med: 2, low: 3 };

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (p !== 0) return p;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** 依任務推導專案進度（0-100）：已完成任務數 / 總任務數（不含已取消/封存）。 */
export function computeProjectProgress(project: Project, allTasks: Task[]): number {
  const related = allTasks.filter((t) => t.projectId === project.id && t.status !== "cancelled" && t.status !== "archived");
  if (related.length === 0) return project.progress ?? 0;
  const done = related.filter((t) => t.status === "completed").length;
  return Math.round((done / related.length) * 100);
}
