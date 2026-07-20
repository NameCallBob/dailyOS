"use client";

import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

import { ManualEntrySheet } from "./manual-entry-sheet";
import { SessionHistory } from "./session-history";
import { StartTimerSheet } from "./start-timer-sheet";
import { StatsPanel } from "./stats-panel";
import { useFocusUiStore } from "./store";
import { TimerCard } from "./timer-card";

export function FocusPageContent() {
  const openSheet = useFocusUiStore((s) => s.openSheet);
  const openManualSheet = useFocusUiStore((s) => s.openManualSheet);
  const closeSheet = useFocusUiStore((s) => s.closeSheet);
  const queryClient = useQueryClient();

  function refreshTimerData() {
    void queryClient.invalidateQueries({ queryKey: ["timer_sessions"] });
    void queryClient.invalidateQueries({ queryKey: ["time_entries"] });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1 text-ink">專注</h1>
          <p className="text-caption text-ink-muted">計時、番茄鐘與時間統計，協助你掌握每一段專注時光。</p>
        </div>
        <Button variant="secondary" onClick={openManualSheet}>
          手動補登
        </Button>
      </header>

      <TimerCard />

      <StatsPanel />

      <SessionHistory />

      <StartTimerSheet open={openSheet === "start"} onClose={closeSheet} onStarted={refreshTimerData} />
      <ManualEntrySheet open={openSheet === "manual"} onClose={closeSheet} onSaved={refreshTimerData} />
    </div>
  );
}
