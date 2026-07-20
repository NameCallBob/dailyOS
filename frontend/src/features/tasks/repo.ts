/**
 * features/tasks/repo.ts — 任務模組資料存取（唯一透過 lib/resource.ts createResource）。
 */

import type { ZodType } from "zod";

import { createResource, nowIso } from "@/lib/resource";

import { projectSchema, tagSchema, taskSchema } from "./schema";
import { seedProjects, seedTags, seedTasks } from "./seed";
import type { Project, Tag, Task } from "./types";

export interface SnoozePayload {
  /** 直接指定新的日期（優先） */
  until?: string;
  /** 或者以「延後幾天」表示 */
  days?: number;
}

export const tasksRepo = createResource<Task, {
  complete: { httpAction: "complete"; trial: (record: Task) => Partial<Task> };
  uncomplete: { httpAction: "uncomplete"; trial: (record: Task) => Partial<Task> };
  snooze: { httpAction: "snooze"; trial: (record: Task, payload: SnoozePayload) => Partial<Task> };
}>({
  name: "tasks",
  schema: taskSchema as unknown as ZodType<Task>,
  seed: seedTasks,
  actions: {
    complete: {
      httpAction: "complete",
      trial: () => ({
        status: "completed",
        completedAt: nowIso(),
      }),
    },
    uncomplete: {
      httpAction: "uncomplete",
      trial: () => ({
        status: "planned",
        completedAt: null,
      }),
    },
    snooze: {
      httpAction: "snooze",
      trial: (record, payload) => {
        const targetDate = payload.until
          ? payload.until
          : (() => {
              const d = record.dueDate ? new Date(record.dueDate) : new Date();
              d.setDate(d.getDate() + (payload.days ?? 1));
              return d.toISOString().slice(0, 10);
            })();
        return { dueDate: targetDate };
      },
    },
  },
});

export const projectsRepo = createResource<Project>({
  name: "projects",
  schema: projectSchema as unknown as ZodType<Project>,
  seed: seedProjects,
});

export const tagsRepo = createResource<Tag>({
  name: "tags",
  schema: tagSchema as unknown as ZodType<Tag>,
  seed: seedTags,
});
