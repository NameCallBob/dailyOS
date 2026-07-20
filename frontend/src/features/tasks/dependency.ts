/**
 * features/tasks/dependency.ts — 任務相依關係（dependsOn）工具函式。
 * 防止相依關係形成循環（A 依賴 B、B 依賴 A 或更長的環）。
 */

import type { Task } from "./types";

export class DependencyCycleError extends Error {
  constructor(message = "相依關係會形成循環，請調整後再試一次。") {
    super(message);
    this.name = "DependencyCycleError";
  }
}

export interface DependencyGraphNode {
  id: string;
  dependsOn: string[];
}

/**
 * 檢查若將 `taskId` 的 dependsOn 換成 `newDependsOn`，是否會在依賴圖中形成環。
 * 以深度優先搜尋（DFS）沿 dependsOn 邊走訪，若回到起點視為環。
 */
export function wouldCreateCycle(
  allTasks: DependencyGraphNode[],
  taskId: string,
  newDependsOn: string[],
): boolean {
  const graph = new Map<string, string[]>();
  for (const task of allTasks) {
    graph.set(task.id, task.id === taskId ? newDependsOn : task.dependsOn);
  }
  if (!graph.has(taskId)) {
    graph.set(taskId, newDependsOn);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dep of graph.get(id) ?? []) {
      if (dfs(dep)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return dfs(taskId);
}

/** 若會造成循環則丟出 DependencyCycleError；否則靜默通過。 */
export function assertNoCycle(allTasks: DependencyGraphNode[], taskId: string, newDependsOn: string[]): void {
  if (newDependsOn.includes(taskId)) {
    throw new DependencyCycleError("任務不能依賴自己。");
  }
  if (wouldCreateCycle(allTasks, taskId, newDependsOn)) {
    throw new DependencyCycleError();
  }
}

/** 取得某任務目前是否仍被未完成的相依任務阻擋（供 UI 顯示「等待中」提示）。 */
export function isBlockedByDependencies(task: Task, tasksById: Map<string, Task>): boolean {
  return task.dependsOn.some((depId) => {
    const dep = tasksById.get(depId);
    return dep ? dep.status !== "completed" && dep.status !== "cancelled" : false;
  });
}
