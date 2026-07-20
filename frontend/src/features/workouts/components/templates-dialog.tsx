"use client";

/** templates-dialog.tsx — 運動範本清單，套用後建立一筆今日新訓練（含動作與組數）。 */

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";

import { useDuplicateWorkout } from "../hooks";
import { workoutsResource } from "../resources";
import type { Workout } from "../schema";
import { combineDateTime, formatInt, todayIsoDate } from "../utils";

export interface TemplatesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TemplatesDialog({ open, onClose }: TemplatesDialogProps) {
  const templatesQuery = workoutsResource.useList({ filters: { isTemplate: true }, ordering: "-updatedAt", pageSize: 100 });
  const duplicate = useDuplicateWorkout();

  const templates = (templatesQuery.data?.results ?? []).filter((w) => w.isTemplate);

  async function handleApply(template: Workout) {
    const date = todayIsoDate();
    const startAt = combineDateTime(date, "07:00");
    try {
      await duplicate.mutateAsync({ sourceId: template.id, target: { date, startAt, isTemplate: false } });
      toast.success(`已套用範本「${template.templateName ?? template.type}」，建立今日新訓練`);
      onClose();
    } catch {
      // 失敗提示已由 hooks.ts 統一顯示。
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="運動範本" description="套用後會以今日日期建立一筆新訓練，並複製動作與組數。">
      {templates.length === 0 ? (
        <EmptyState
          title="尚無範本"
          description="在訓練詳情畫面點選「另存為範本」，或新增訓練時勾選「設為運動範本」即可建立。"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {templates.map((template) => (
            <li key={template.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-body text-ink">{template.templateName ?? `${template.type}範本`}</p>
                <p className="text-caption text-ink-muted">
                  {template.type} · {formatInt(template.durationMin)} 分鐘
                  {template.goal ? ` · ${template.goal}` : ""}
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => handleApply(template)} loading={duplicate.isPending}>
                套用
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
