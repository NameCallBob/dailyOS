/**
 * features/tasks/seed.ts — 試用模式種子資料（繁體中文，日期分布於近 30 天內）。
 */

import type { Project, Tag, Task } from "./types";

function isoDaysFromNow(offsetDays: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

function dateOnlyDaysFromNow(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function record<T extends Record<string, unknown>>(id: string, createdOffset: number, fields: T) {
  const createdAt = isoDaysFromNow(createdOffset, 8, 30);
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    version: 1,
    deleted: false,
    ...fields,
  };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export function seedTags(): Tag[] {
  const defs: Array<[string, string, string]> = [
    ["tag-work", "工作", "#8a6a52"],
    ["tag-personal", "個人", "#5b7a99"],
    ["tag-urgent", "緊急", "#a3372e"],
    ["tag-shopping", "採購", "#93701f"],
    ["tag-learning", "學習", "#3f6b4a"],
    ["tag-finance", "財務", "#6b5b95"],
    ["tag-family", "家庭", "#c0708a"],
    ["tag-health", "健康", "#2f8f8f"],
  ];
  return defs.map(([id, name, color], i) => record(id, -25 + i, { name, color }) as Tag);
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function seedProjects(): Project[] {
  return [
    record("proj-website", -28, {
      name: "官網改版",
      description: "公司官網視覺與內容全面更新，含 SEO 優化。",
      status: "active",
      color: "#8a6a52",
      startDate: dateOnlyDaysFromNow(-28),
      targetDate: dateOnlyDaysFromNow(20),
      progress: 0,
      milestones: [
        { id: "ms-1", title: "資訊架構定案", dueDate: dateOnlyDaysFromNow(-10), done: true },
        { id: "ms-2", title: "視覺稿完成", dueDate: dateOnlyDaysFromNow(3), done: false },
        { id: "ms-3", title: "上線", dueDate: dateOnlyDaysFromNow(20), done: false },
      ],
    }) as Project,
    record("proj-launch", -20, {
      name: "產品發表會",
      description: "Q3 新產品線下發表會籌辦。",
      status: "active",
      color: "#5b7a99",
      startDate: dateOnlyDaysFromNow(-20),
      targetDate: dateOnlyDaysFromNow(15),
      progress: 0,
      milestones: [
        { id: "ms-4", title: "場地確認", dueDate: dateOnlyDaysFromNow(-5), done: true },
        { id: "ms-5", title: "邀請名單確定", dueDate: dateOnlyDaysFromNow(5), done: false },
      ],
    }) as Project,
    record("proj-home", -15, {
      name: "居家整理",
      description: "搬家後續整理與採買清單。",
      status: "planning",
      color: "#93701f",
      startDate: dateOnlyDaysFromNow(-15),
      targetDate: dateOnlyDaysFromNow(30),
      progress: 0,
      milestones: [{ id: "ms-6", title: "客廳收納完成", dueDate: dateOnlyDaysFromNow(10), done: false }],
    }) as Project,
    record("proj-course", -12, {
      name: "線上課程製作",
      description: "錄製並剪輯前端開發線上課程共 10 集。",
      status: "on_hold",
      color: "#3f6b4a",
      startDate: dateOnlyDaysFromNow(-12),
      targetDate: dateOnlyDaysFromNow(45),
      progress: 0,
      milestones: [{ id: "ms-7", title: "前 3 集腳本完成", dueDate: dateOnlyDaysFromNow(-2), done: true }],
    }) as Project,
    record("proj-health", -8, {
      name: "健康檢查追蹤",
      description: "年度健檢後續複診與報告追蹤。",
      status: "active",
      color: "#2f8f8f",
      startDate: dateOnlyDaysFromNow(-8),
      targetDate: dateOnlyDaysFromNow(25),
      progress: 0,
      milestones: [],
    }) as Project,
    record("proj-old", -60, {
      name: "去年度盤點",
      description: "已封存的年度盤點專案。",
      status: "archived",
      color: "#9a9a9a",
      startDate: dateOnlyDaysFromNow(-90),
      targetDate: dateOnlyDaysFromNow(-40),
      progress: 100,
      milestones: [{ id: "ms-8", title: "結案報告", dueDate: dateOnlyDaysFromNow(-40), done: true }],
    }) as Project,
  ];
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function seedTasks(): Task[] {
  const base = (
    id: string,
    createdOffset: number,
    fields: Omit<
      Task,
      "id" | "createdAt" | "updatedAt" | "version" | "deleted"
    >,
  ) => record(id, createdOffset, fields) as Task;

  const common = {
    description: null,
    projectId: null,
    tags: [] as string[],
    dueDate: null,
    scheduledAt: null,
    estimateMin: null,
    actualMin: null,
    energy: null,
    context: null,
    recurrenceRule: null,
    parentId: null,
    dependsOn: [] as string[],
    remindAt: null,
    completedAt: null,
    archived: false,
  };

  return [
    base("task-1", -3, {
      ...common,
      title: "確認官網視覺稿配色",
      description: "與設計師討論首頁配色方案，確認是否符合品牌調性。",
      status: "in_progress",
      priority: "high",
      projectId: "proj-website",
      tags: ["tag-work"],
      dueDate: dateOnlyDaysFromNow(1),
      scheduledAt: isoDaysFromNow(0, 14, 0),
      estimateMin: 60,
      energy: "high",
      context: "@辦公室",
    }),
    base("task-2", -5, {
      ...common,
      title: "撰寫官網 SEO 關鍵字清單",
      status: "planned",
      priority: "med",
      projectId: "proj-website",
      tags: ["tag-work", "tag-learning"],
      dueDate: dateOnlyDaysFromNow(4),
      estimateMin: 90,
      energy: "med",
      dependsOn: ["task-1"],
    }),
    base("task-3", -1, {
      ...common,
      title: "回覆客戶信箱詢價",
      status: "inbox",
      priority: "urgent",
      tags: ["tag-work", "tag-urgent"],
      context: "@電腦",
      estimateMin: 20,
    }),
    base("task-4", -18, {
      ...common,
      title: "預訂發表會場地",
      status: "completed",
      priority: "high",
      projectId: "proj-launch",
      tags: ["tag-work"],
      dueDate: dateOnlyDaysFromNow(-5),
      completedAt: isoDaysFromNow(-6, 16, 0),
      estimateMin: 45,
      actualMin: 50,
    }),
    base("task-5", -10, {
      ...common,
      title: "確定發表會邀請名單",
      status: "in_progress",
      priority: "high",
      projectId: "proj-launch",
      tags: ["tag-work"],
      dueDate: dateOnlyDaysFromNow(5),
      scheduledAt: isoDaysFromNow(2, 10, 0),
      estimateMin: 120,
      energy: "med",
      dependsOn: ["task-4"],
    }),
    base("task-6", -9, {
      ...common,
      title: "撰寫發表會新聞稿",
      status: "blocked",
      priority: "med",
      projectId: "proj-launch",
      tags: ["tag-work"],
      dueDate: dateOnlyDaysFromNow(8),
      dependsOn: ["task-5"],
      estimateMin: 60,
    }),
    base("task-7", -14, {
      ...common,
      title: "客廳收納櫃採購",
      status: "planned",
      priority: "low",
      projectId: "proj-home",
      tags: ["tag-personal", "tag-shopping"],
      dueDate: dateOnlyDaysFromNow(9),
      estimateMin: 30,
      energy: "low",
    }),
    base("task-7a", -14, {
      ...common,
      title: "量測收納櫃尺寸",
      status: "completed",
      priority: "low",
      projectId: "proj-home",
      tags: ["tag-personal"],
      parentId: "task-7",
      completedAt: isoDaysFromNow(-12, 19, 0),
      estimateMin: 15,
      actualMin: 10,
    }),
    base("task-7b", -14, {
      ...common,
      title: "比較三間家具店報價",
      status: "in_progress",
      priority: "low",
      projectId: "proj-home",
      tags: ["tag-personal", "tag-shopping"],
      parentId: "task-7",
      dueDate: dateOnlyDaysFromNow(6),
      estimateMin: 40,
    }),
    base("task-8", -11, {
      ...common,
      title: "剪輯線上課程第一集",
      status: "planned",
      priority: "med",
      projectId: "proj-course",
      tags: ["tag-work", "tag-learning"],
      dueDate: dateOnlyDaysFromNow(15),
      estimateMin: 180,
      energy: "high",
    }),
    base("task-9", -7, {
      ...common,
      title: "預約心臟科複診",
      status: "planned",
      priority: "high",
      projectId: "proj-health",
      tags: ["tag-health"],
      dueDate: dateOnlyDaysFromNow(2),
      remindAt: isoDaysFromNow(1, 9, 0),
      estimateMin: 15,
    }),
    base("task-10", -6, {
      ...common,
      title: "每週採買生鮮食材",
      status: "planned",
      priority: "med",
      tags: ["tag-personal", "tag-shopping"],
      dueDate: dateOnlyDaysFromNow(0),
      recurrenceRule: "FREQ=WEEKLY;BYDAY=SA",
      estimateMin: 45,
      energy: "low",
    }),
    base("task-11", -4, {
      ...common,
      title: "繳交信用卡帳單",
      status: "inbox",
      priority: "urgent",
      tags: ["tag-finance"],
      dueDate: dateOnlyDaysFromNow(2),
      estimateMin: 5,
    }),
    base("task-12", -22, {
      ...common,
      title: "整理去年度盤點報告歸檔",
      status: "archived",
      priority: "low",
      projectId: "proj-old",
      tags: ["tag-work"],
      completedAt: isoDaysFromNow(-40, 17, 0),
      archived: true,
    }),
    base("task-13", -2, {
      ...common,
      title: "與家人規劃週末出遊",
      status: "cancelled",
      priority: "low",
      tags: ["tag-family", "tag-personal"],
      dueDate: dateOnlyDaysFromNow(3),
    }),
    base("task-14", -1, {
      ...common,
      title: "更新履歷與作品集",
      status: "planned",
      priority: "med",
      tags: ["tag-personal", "tag-learning"],
      dueDate: dateOnlyDaysFromNow(12),
      estimateMin: 90,
    }),
  ];
}
