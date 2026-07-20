"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PRIORITY_LABEL } from "../constants";
import type { TaskTemplate } from "../store";

export interface TemplatePickerProps {
  templates: TaskTemplate[];
  onPick: (template: TaskTemplate) => void;
}

/** 快速從範本建立任務：一鍵帶入標題/優先權/預估時間等欄位。 */
export function TemplatePicker({ templates, onPick }: TemplatePickerProps) {
  if (templates.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-label uppercase text-ink-muted">範本</span>
      {templates.map((tpl) => (
        <Button key={tpl.id} type="button" variant="secondary" size="sm" onClick={() => onPick(tpl)}>
          {tpl.name}
          <Badge tone="neutral" withGlyph={false} className="ml-1">
            {PRIORITY_LABEL[tpl.priority]}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
