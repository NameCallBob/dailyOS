"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { ENERGY_LABEL, PRIORITY_LABEL } from "../constants";
import type { TaskFilters } from "../store";
import { TASK_ENERGIES, TASK_PRIORITIES } from "../types";
import type { Project, Tag } from "../types";

export interface FiltersBarProps {
  filters: TaskFilters;
  onChange: (patch: Partial<TaskFilters>) => void;
  onReset: () => void;
  projects: Project[];
  tags: Tag[];
}

export function FiltersBar({ filters, onChange, onReset, projects, tags }: FiltersBarProps) {
  const hasActiveFilters =
    filters.search !== "" || filters.projectId !== "all" || filters.tag !== "all" || filters.priority !== "all" || filters.energy !== "all";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full max-w-xs">
        <Input
          label="搜尋"
          placeholder="搜尋標題、描述、情境"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>
      <div className="w-40">
        <Select
          label="專案"
          value={filters.projectId}
          onChange={(e) => onChange({ projectId: e.target.value })}
          options={[{ value: "all", label: "全部專案" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
        />
      </div>
      <div className="w-36">
        <Select
          label="標籤"
          value={filters.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
          options={[{ value: "all", label: "全部標籤" }, ...tags.map((t) => ({ value: t.id, label: t.name }))]}
        />
      </div>
      <div className="w-32">
        <Select
          label="優先權"
          value={filters.priority}
          onChange={(e) => onChange({ priority: e.target.value as TaskFilters["priority"] })}
          options={[{ value: "all", label: "全部" }, ...TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))]}
        />
      </div>
      <div className="w-32">
        <Select
          label="精力"
          value={filters.energy}
          onChange={(e) => onChange({ energy: e.target.value as TaskFilters["energy"] })}
          options={[{ value: "all", label: "全部" }, ...TASK_ENERGIES.map((en) => ({ value: en, label: ENERGY_LABEL[en] }))]}
        />
      </div>
      {hasActiveFilters ? (
        <button type="button" onClick={onReset} className="h-10 text-caption text-ink-muted underline hover:text-ink">
          清除篩選
        </button>
      ) : null}
    </div>
  );
}
