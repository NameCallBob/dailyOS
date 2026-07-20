"use client";

import { useOnlineStatus } from "@/components/pwa/use-online-status";
import { OfflineState } from "@/components/ui/error-state";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { isAuth } from "@/lib/mode";

import { useWorkoutsStore, type WorkoutTab } from "../store";
import { LibrarySection } from "./library-section";
import { LogSection } from "./log-section";
import { OverviewSection } from "./overview-section";

const TAB_ITEMS: TabItem[] = [
  { value: "overview", label: "總覽" },
  { value: "log", label: "訓練紀錄" },
  { value: "library", label: "動作庫" },
];

export function WorkoutsPage() {
  const tab = useWorkoutsStore((s) => s.tab);
  const setTab = useWorkoutsStore((s) => s.setTab);
  const online = useOnlineStatus();
  const offlineBlocked = isAuth() && !online;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">健身</h1>
        <p className="text-caption text-ink-muted">
          記錄重訓組數、有氧數據與訓練感受，追蹤訓練容量、每週運動時間、部位分布與恢復狀況。
        </p>
      </header>

      <Tabs items={TAB_ITEMS} value={tab} onChange={(v) => setTab(v as WorkoutTab)} />

      {offlineBlocked ? (
        <OfflineState />
      ) : (
        <>
          {tab === "overview" ? <OverviewSection /> : null}
          {tab === "log" ? <LogSection /> : null}
          {tab === "library" ? <LibrarySection /> : null}
        </>
      )}
    </div>
  );
}
