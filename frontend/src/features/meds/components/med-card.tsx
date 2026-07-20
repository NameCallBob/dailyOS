"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { formatDoseWithUnit, formatFrequencySummary, formatRemainingQty, needsRefill } from "../format";
import { repoFor, useDeleteItemWithUndo } from "../hooks";
import { useMedsUiStore } from "../store";
import { WITH_FOOD_LABEL, type Medication, type SourceType } from "../types";

export interface MedCardProps {
  sourceType: SourceType;
  item: Medication;
}

export function MedCard({ sourceType, item }: MedCardProps) {
  const openEditForm = useMedsUiStore((s) => s.openEditForm);
  const openDoseDialog = useMedsUiStore((s) => s.openDoseDialog);
  const openRefillDialog = useMedsUiStore((s) => s.openRefillDialog);
  const toggleActive = repoFor(sourceType).actions.toggleActive;
  const { deleteItem } = useDeleteItemWithUndo();

  const remaining = formatRemainingQty(item);
  const refillDue = needsRefill(item);

  async function handleToggleActive() {
    try {
      await toggleActive(item.id);
      toast.success(item.active ? `已停用「${item.name}」。` : `已重新啟用「${item.name}」。`);
    } catch {
      toast.error("操作失敗，請再試一次。");
    }
  }

  return (
    <Card className={!item.active ? "opacity-70" : undefined}>
      <CardHeader>
        <div>
          <h3 className="text-h3 text-ink">{item.name}</h3>
          <p className="text-caption text-ink-muted tabular-nums">
            {formatDoseWithUnit(item)} · {formatFrequencySummary(item)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!item.active ? <Badge tone="neutral">已停用</Badge> : null}
          {refillDue ? <Badge tone="warning">需要補貨</Badge> : null}
        </div>
      </CardHeader>

      <CardBody className="flex flex-col gap-2">
        <p className="text-caption text-ink-muted">{WITH_FOOD_LABEL[item.withFood]}</p>
        {remaining ? (
          <p className={`text-body tabular-nums ${refillDue ? "text-warning" : "text-ink-soft"}`}>{remaining}</p>
        ) : null}
        {item.endDate ? <p className="text-caption text-ink-faint">療程至 {item.endDate}</p> : null}
        {item.notes ? <p className="text-caption text-ink-faint">{item.notes}</p> : null}
      </CardBody>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Button size="sm" onClick={() => openDoseDialog(sourceType, item.id)}>
          記錄服用
        </Button>
        {item.remainingQty !== undefined ? (
          <Button size="sm" variant="secondary" onClick={() => openRefillDialog(sourceType, item.id)}>
            補貨
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEditForm(sourceType, item.id)}>
            編輯
          </Button>
          <Button size="sm" variant="ghost" onClick={handleToggleActive}>
            {item.active ? "停用" : "啟用"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => deleteItem(sourceType, item)}>
            刪除
          </Button>
        </div>
      </div>
    </Card>
  );
}
