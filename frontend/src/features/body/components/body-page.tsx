"use client";

import { useState } from "react";

import { Tabs } from "@/components/ui/tabs";
import { OfflineState } from "@/components/ui/error-state";
import { useOnlineStatus } from "@/components/pwa/use-online-status";
import { isAuth } from "@/lib/mode";

import { MetricsSection } from "./metrics-section";
import { WaterSection } from "./water-section";

const TAB_ITEMS = [
  { value: "metrics", label: "身形量測" },
  { value: "water", label: "飲水紀錄" },
];

export function BodyPage() {
  const [tab, setTab] = useState("metrics");
  const online = useOnlineStatus();
  const offlineBlocked = isAuth() && !online;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">身體數據</h1>
        <p className="text-caption text-ink-muted">
          記錄體重、體脂與圍度等身形量測，以及每日飲水量。所有圖表僅供長期趨勢參考，請避免以單次量測下結論。
        </p>
      </header>

      <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />

      {offlineBlocked ? (
        <OfflineState />
      ) : (
        <>
          {tab === "metrics" ? <MetricsSection /> : null}
          {tab === "water" ? <WaterSection /> : null}
        </>
      )}
    </div>
  );
}
