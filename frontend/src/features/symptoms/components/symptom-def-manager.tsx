"use client";

/**
 * symptom-def-manager.tsx — 管理自訂症狀清單（新增／編輯／封存）。
 * 封存（archived）不會刪除歷史紀錄，只是不再出現在快速紀錄的預設選單。
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";

import { symptomDefsResource } from "../resources";
import type { SymptomDefinition } from "../schema";

export interface SymptomDefManagerProps {
  open: boolean;
  onClose: () => void;
  defs: SymptomDefinition[];
  onEdit: (def: SymptomDefinition) => void;
  onCreate: () => void;
}

export function SymptomDefManager({ open, onClose, defs, onEdit, onCreate }: SymptomDefManagerProps) {
  const updateMutation = symptomDefsResource.useUpdate();

  function toggleArchived(def: SymptomDefinition) {
    updateMutation.mutate(
      { id: def.id, patch: { archived: !def.archived } },
      {
        onSuccess: () => {
          toast.success(def.archived ? `已將「${def.name}」還原至常用清單` : `已封存「${def.name}」`);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="管理症狀"
      description="封存的症狀不會出現在快速紀錄選單中，但歷史紀錄會完整保留。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            關閉
          </Button>
          <Button type="button" onClick={onCreate}>
            + 新增症狀
          </Button>
        </>
      }
    >
      {defs.length === 0 ? (
        <EmptyState title="尚未建立任何症狀" description="點擊右下角「新增症狀」開始建立。" />
      ) : (
        <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
          {defs.map((def) => (
            <li
              key={def.id}
              className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-body text-ink">{def.name}</span>
                  <Badge tone="neutral">{def.category}</Badge>
                  {def.archived ? <Badge tone="neutral">已封存</Badge> : null}
                </div>
                {def.note ? <span className="text-caption text-ink-muted">{def.note}</span> : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(def)}>
                  編輯
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleArchived(def)}>
                  {def.archived ? "還原" : "封存"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
