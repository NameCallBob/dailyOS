/**
 * features/tasks/store.ts — 任務模組本地 UI 狀態（zustand）。
 * 資料存取一律走 repo.ts；此處只放檢視狀態、篩選條件、批次選取、範本清單。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { TaskEnergy, TaskLayout, TaskPriority, TaskStatus, TaskView } from "./types";

export interface TaskFilters {
  search: string;
  projectId: string | "all";
  tag: string | "all";
  priority: TaskPriority | "all";
  energy: TaskEnergy | "all";
}

export const DEFAULT_FILTERS: TaskFilters = {
  search: "",
  projectId: "all",
  tag: "all",
  priority: "all",
  energy: "all",
};

export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  estimateMin?: number;
  energy?: TaskEnergy;
  context?: string;
}

export const BUILTIN_TEMPLATES: TaskTemplate[] = [
  { id: "tpl-daily-review", name: "每日回顧", title: "每日回顧與明日規劃", priority: "med", estimateMin: 15, energy: "low" },
  { id: "tpl-meeting", name: "會議準備", title: "會議前準備資料", priority: "high", estimateMin: 30, energy: "med" },
  { id: "tpl-email", name: "信件處理", title: "清空收件匣", priority: "low", estimateMin: 20, energy: "low", context: "@電腦" },
  { id: "tpl-shopping", name: "採購清單", title: "整理採購清單", priority: "low", estimateMin: 10, energy: "low", context: "@手機" },
];

interface TasksState {
  view: TaskView;
  layout: TaskLayout;
  filters: TaskFilters;
  selectedIds: string[];
  customTemplates: TaskTemplate[];
  setView: (view: TaskView) => void;
  setLayout: (layout: TaskLayout) => void;
  setFilters: (patch: Partial<TaskFilters>) => void;
  resetFilters: () => void;
  toggleSelected: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clearSelection: () => void;
  addTemplate: (template: TaskTemplate) => void;
  removeTemplate: (id: string) => void;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      view: "today",
      layout: "list",
      filters: DEFAULT_FILTERS,
      selectedIds: [],
      customTemplates: [],
      setView: (view) => set({ view }),
      setLayout: (layout) => set({ layout }),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
      toggleSelected: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((existing) => existing !== id)
            : [...s.selectedIds, id],
        })),
      selectMany: (ids) => set({ selectedIds: ids }),
      clearSelection: () => set({ selectedIds: [] }),
      addTemplate: (template) => set((s) => ({ customTemplates: [...s.customTemplates, template] })),
      removeTemplate: (id) =>
        set((s) => ({ customTemplates: s.customTemplates.filter((t) => t.id !== id) })),
    }),
    {
      name: "daios-tasks-ui",
      partialize: (s) => ({ layout: s.layout, customTemplates: s.customTemplates }),
    },
  ),
);
