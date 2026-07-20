"use client";

/**
 * water-widget.tsx — 飲水 Widget：快速按鈕（250/350/500/自訂 + 常用容器）、
 * 今日總量／每日目標進度。可獨立嵌入總覽頁或飲水分頁頂端。
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

import { WATER_QUICK_AMOUNTS } from "../constants";
import { waterLogsResource } from "../resources";
import { useWaterPrefs } from "../water-store";
import { formatInt, todayIsoDate } from "../utils";

export interface WaterWidgetProps {
  todayTotalMl: number;
  onManageSettings: () => void;
}

export function WaterWidget({ todayTotalMl, onManageSettings }: WaterWidgetProps) {
  const createMutation = waterLogsResource.useCreate();
  const { dailyGoalMl, containers } = useWaterPrefs();
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const progress = dailyGoalMl > 0 ? Math.min(1, todayTotalMl / dailyGoalMl) : 0;

  async function logAmount(amountMl: number, containerLabel?: string) {
    if (amountMl <= 0) return;
    try {
      const now = new Date();
      await createMutation.mutateAsync({
        date: todayIsoDate(),
        loggedAt: now.toISOString(),
        amountMl,
        containerLabel,
        source: "manual",
      });
      toast.success(`已記錄 ${formatInt(amountMl)} 毫升`);
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  function handleCustomSubmit() {
    const amount = Number(customAmount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      toast.error("請輸入大於 0 的飲水量");
      return;
    }
    void logAmount(amount);
    setCustomAmount("");
    setCustomOpen(false);
  }

  return (
    <div className="rounded-lg border border-line bg-paper-raised p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-label uppercase text-ink-muted">今日飲水</p>
          <p className="text-numeric tabular-nums text-ink">
            {formatInt(todayTotalMl)}
            <span className="ml-1 text-caption font-normal text-ink-muted">/ {formatInt(dailyGoalMl)} mL</span>
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onManageSettings}>
          設定目標／容器
        </Button>
      </div>

      <div
        role="progressbar"
        aria-label="今日飲水進度"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mb-4 h-2 w-full overflow-hidden rounded-full bg-paper-sunken"
      >
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {WATER_QUICK_AMOUNTS.map((amount) => (
          <Button key={amount} type="button" variant="secondary" size="sm" onClick={() => void logAmount(amount)}>
            +{amount} mL
          </Button>
        ))}
        {containers.map((container) => (
          <Button
            key={container.id}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void logAmount(container.amountMl, container.label)}
          >
            {container.label} {container.amountMl}mL
          </Button>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={() => setCustomOpen(true)}>
          + 自訂
        </Button>
      </div>

      <Dialog open={customOpen} onClose={() => setCustomOpen(false)} title="自訂飲水量">
        <div className="flex flex-col gap-3">
          <Input
            type="number"
            inputMode="numeric"
            label="飲水量（mL）"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCustomOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleCustomSubmit}>
              記錄
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
