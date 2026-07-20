"use client";

import { Segmented } from "@/components/ui/segmented";
import { Tabs } from "@/components/ui/tabs";

import { TASK_VIEW_LABEL } from "../constants";
import { TASK_VIEWS } from "../types";
import type { TaskLayout, TaskView } from "../types";

export interface ViewTabsProps {
  view: TaskView;
  layout: TaskLayout;
  onViewChange: (view: TaskView) => void;
  onLayoutChange: (layout: TaskLayout) => void;
}

export function ViewTabs({ view, layout, onViewChange, onLayoutChange }: ViewTabsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs
        items={TASK_VIEWS.map((v) => ({ value: v, label: TASK_VIEW_LABEL[v] }))}
        value={view}
        onChange={(v) => onViewChange(v as TaskView)}
      />
      <Segmented
        label="檢視模式"
        value={layout}
        onChange={(v) => onLayoutChange(v as TaskLayout)}
        options={[
          { value: "list", label: "清單" },
          { value: "board", label: "看板" },
        ]}
      />
    </div>
  );
}
