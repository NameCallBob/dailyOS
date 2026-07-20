"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { today } from "../date";
import { useRecordDose } from "../hooks";
import { useMedsUiStore } from "../store";
import { LOG_STATUS_LABEL, LOG_STATUSES, type LogStatus, type Medication, type SourceType } from "../types";

export interface TakeDoseDialogProps {
  sourceType: SourceType;
  item: Medication;
}

const STATUS_OPTIONS = LOG_STATUSES.map((value) => ({ value, label: LOG_STATUS_LABEL[value] }));

/**
 * 記錄一次服用/漏服/略過；可從已設定的時段選擇，也可自訂時間（例如需要時服用）。
 * 只在開啟時才掛載內層表單，讓每次開啟都取得乾淨的初始值，避免用 effect 同步 state。
 */
export function TakeDoseDialog({ sourceType, item }: TakeDoseDialogProps) {
  const open = useMedsUiStore((s) => s.doseDialogItemId === item.id && s.doseDialogSourceType === sourceType);
  const closeDoseDialog = useMedsUiStore((s) => s.closeDoseDialog);

  if (!open) return null;

  return <TakeDoseDialogForm key={item.id} sourceType={sourceType} item={item} onClose={closeDoseDialog} />;
}

interface TakeDoseDialogFormProps {
  sourceType: SourceType;
  item: Medication;
  onClose: () => void;
}

function TakeDoseDialogForm({ sourceType, item, onClose }: TakeDoseDialogFormProps) {
  const { mutate, isPending } = useDoseState();
  const [status, setStatus] = useState<LogStatus>("taken");
  const [time, setTime] = useState(item.times[0] ?? "12:00");
  const [quantity, setQuantity] = useState(String(item.dose));
  const [note, setNote] = useState("");

  async function handleSave() {
    const parsedQty = Number(quantity);
    await mutate({
      sourceType,
      item,
      status,
      scheduledFor: `${today()}T${time}:00.000Z`,
      quantity: status === "taken" && !Number.isNaN(parsedQty) ? parsedQty : undefined,
      note: note.trim() || undefined,
    });
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`記錄「${item.name}」`}
      description="記錄本次服用情形；不會提供劑量或安全性建議。"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            取消
          </Button>
          <Button onClick={handleSave} loading={isPending}>
            儲存
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="狀態" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value as LogStatus)} />
        <Input label="時間" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        {status === "taken" ? (
          <Input
            label="服用數量"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            hint={item.unit ? `單位：${item.unit}` : undefined}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        ) : null}
        <Textarea label="備註（選填）" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：忘記帶藥、外出用餐延後" />
      </div>
    </Dialog>
  );
}

function useDoseState() {
  const { mutate } = useRecordDose();
  const [isPending, setIsPending] = useState(false);

  async function run(input: Parameters<typeof mutate>[0]) {
    setIsPending(true);
    try {
      await mutate(input);
    } finally {
      setIsPending(false);
    }
  }

  return { mutate: run, isPending };
}
