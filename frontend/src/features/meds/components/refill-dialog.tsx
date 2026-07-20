"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRefillItem } from "../hooks";
import { useMedsUiStore } from "../store";
import type { Medication, SourceType } from "../types";

export interface RefillDialogProps {
  sourceType: SourceType;
  item: Medication;
}

/**
 * 補貨：使用者自行輸入新的剩餘量，系統不建議應補貨的數量。
 * 只在開啟時才掛載內層表單，讓每次開啟都取得乾淨的初始值，避免用 effect 同步 state。
 */
export function RefillDialog({ sourceType, item }: RefillDialogProps) {
  const open = useMedsUiStore((s) => s.refillDialogItemId === item.id && s.refillDialogSourceType === sourceType);
  const closeRefillDialog = useMedsUiStore((s) => s.closeRefillDialog);

  if (!open) return null;

  return <RefillDialogForm key={item.id} sourceType={sourceType} item={item} onClose={closeRefillDialog} />;
}

interface RefillDialogFormProps {
  sourceType: SourceType;
  item: Medication;
  onClose: () => void;
}

function RefillDialogForm({ sourceType, item, onClose }: RefillDialogFormProps) {
  const refillItem = useRefillItem();
  const [qty, setQty] = useState(String(item.remainingQty ?? 0));

  function handleSave() {
    const parsed = Number(qty);
    if (Number.isNaN(parsed) || parsed < 0) return;
    refillItem(sourceType, item, parsed);
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`補貨「${item.name}」`}
      description="輸入補貨後的新剩餘量。"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>儲存</Button>
        </>
      }
    >
      <Input
        label="新的剩餘量"
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        hint={item.unit ? `單位：${item.unit}` : undefined}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
      />
    </Dialog>
  );
}
