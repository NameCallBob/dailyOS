"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { NavIcon } from "@/components/ui/nav-icon";
import type { DaiosMode } from "@/lib/mode";

import { MobileNavSheet } from "./mobile-nav-sheet";
import { ModeBadge } from "./mode-badge";
import { OfflineIndicator } from "./offline-indicator";
import { useQuickAddStore } from "@/components/quick-add/store";

export function Topbar({ mode }: { mode: DaiosMode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const showQuickAdd = useQuickAddStore((s) => s.show);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-paper/80 sm:px-6">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="開啟所有模組選單"
          className="rounded-md p-2 text-ink-soft hover:bg-paper-sunken lg:hidden"
        >
          <NavIcon name="menu" />
        </button>

        <div className="flex flex-1 items-center gap-2 lg:hidden">
          <span className="text-h3 text-ink">DailyOS</span>
        </div>

        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <ModeBadge mode={mode} />
          <Button size="sm" onClick={showQuickAdd} aria-keyshortcuts="Meta+K">
            <NavIcon name="quick-add" size={16} />
            <span className="hidden sm:inline">快速新增</span>
          </Button>
        </div>
      </header>

      <MobileNavSheet open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
