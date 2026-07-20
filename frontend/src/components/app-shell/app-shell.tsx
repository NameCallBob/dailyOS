"use client";

import type { ReactNode } from "react";

import { QuickAdd } from "@/components/quick-add/quick-add";
import type { DaiosMode } from "@/lib/mode";

import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ mode, children }: { mode: DaiosMode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar mode={mode} />
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <BottomNav />
      <QuickAdd />
    </div>
  );
}
