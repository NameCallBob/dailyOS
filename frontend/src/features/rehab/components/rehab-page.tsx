"use client";

import { Tabs } from "@/components/ui/tabs";
import { OfflineState } from "@/components/ui/error-state";
import { useOnlineStatus } from "@/components/pwa/use-online-status";
import { isAuth } from "@/lib/mode";

import { REHAB_TAB_OPTIONS } from "../constants";
import { useRehabUiStore } from "../store";
import { PlansTab } from "./plans-tab";
import { SummaryTab } from "./summary-tab";
import { TimelineTab } from "./timeline-tab";
import { TodayTab } from "./today-tab";

export function RehabPage() {
  const tab = useRehabUiStore((s) => s.tab);
  const setTab = useRehabUiStore((s) => s.setTab);
  const online = useOnlineStatus();
  const offlineBlocked = isAuth() && !online;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">復健</h1>
        <p className="text-caption text-ink-muted">
          管理復健計畫與項目、記錄每日執行狀況、追蹤回診時間線與每週摘要。組數、次數、負重等處方數值僅能由您主動編輯，系統不會自行增加復健強度。
        </p>
      </header>

      <Tabs items={REHAB_TAB_OPTIONS} value={tab} onChange={setTab} />

      {offlineBlocked ? (
        <OfflineState />
      ) : (
        <>
          {tab === "today" ? <TodayTab /> : null}
          {tab === "plans" ? <PlansTab /> : null}
          {tab === "timeline" ? <TimelineTab /> : null}
          {tab === "summary" ? <SummaryTab /> : null}
        </>
      )}
    </div>
  );
}
