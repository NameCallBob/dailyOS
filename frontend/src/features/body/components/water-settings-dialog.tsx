"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

import { useWaterPrefs } from "../water-store";

export interface WaterSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function WaterSettingsDialog({ open, onClose }: WaterSettingsDialogProps) {
  const { dailyGoalMl, containers, setDailyGoal, addContainer, removeContainer } = useWaterPrefs();
  const [goalInput, setGoalInput] = useState(String(dailyGoalMl));
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");

  // 開啟對話框時將目標輸入框重設為最新值：於 render 階段依 prop 變化調整 state，
  // 避免在 effect 中同步呼叫 setState（cascading renders）。
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setGoalInput(String(dailyGoalMl));
  }

  function handleSaveGoal() {
    const value = Number(goalInput);
    if (!value || Number.isNaN(value) || value <= 0) {
      toast.error("請輸入有效的每日目標");
      return;
    }
    setDailyGoal(value);
    toast.success("已更新每日飲水目標");
  }

  function handleAddContainer() {
    const amount = Number(newAmount);
    if (!newLabel.trim()) {
      toast.error("請輸入容器名稱");
      return;
    }
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      toast.error("請輸入有效的容量");
      return;
    }
    addContainer(newLabel.trim(), amount);
    setNewLabel("");
    setNewAmount("");
  }

  return (
    <Dialog open={open} onClose={onClose} title="飲水設定" description="設定每日目標與常用容器，方便快速記錄。">
      <div className="flex flex-col gap-6">
        <div className="flex items-end gap-2">
          <Input
            type="number"
            inputMode="numeric"
            label="每日目標（mL）"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="secondary" onClick={handleSaveGoal}>
            儲存
          </Button>
        </div>

        <div>
          <p className="mb-2 text-label uppercase text-ink-muted">常用容器</p>
          <ul className="flex flex-col gap-2">
            {containers.map((container) => (
              <li key={container.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-body">
                <span>
                  {container.label} · <span className="tabular-nums">{container.amountMl}</span> mL
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeContainer(container.id)}>
                  移除
                </Button>
              </li>
            ))}
            {containers.length === 0 ? <li className="text-caption text-ink-muted">尚無常用容器。</li> : null}
          </ul>
        </div>

        <div className="flex items-end gap-2">
          <Input label="容器名稱" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="flex-1" />
          <Input
            type="number"
            inputMode="numeric"
            label="容量（mL）"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="w-28"
          />
          <Button type="button" variant="secondary" onClick={handleAddContainer}>
            新增
          </Button>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            完成
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
