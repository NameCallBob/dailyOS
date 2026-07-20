"use client";

import { useEffect, type ReactNode } from "react";

import { QuickAdd } from "@/components/quick-add/quick-add";
import { toast } from "@/components/ui/toast";
import { initReminders } from "@/features/reminders";
import { consumePendingModeSwitchNotice } from "@/features/settings/mode-actions";
import { initSync } from "@/features/sync";
import type { DaiosMode } from "@/lib/mode";

import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ mode, children }: { mode: DaiosMode; children: ReactNode }) {
  useEffect(() => {
    // initReminders()：trial / local 模式下才有本機資料可掃描（內部依 isLocalData() 自我判斷，
    // 其餘情況為 no-op）；initSync()：僅本機（local）模式且已登入才會真正啟動輪詢（同樣自我判斷）。
    const stopReminders = initReminders();
    const stopSync = initSync();

    // 模式切換一律整頁導頁到 /dashboard（見 mode-actions.ts），此處在 App Shell 掛載時
    // 讀取一次「切換後」提示（若有），顯示後即從 sessionStorage 清除，不會重複跳出。
    const notice = consumePendingModeSwitchNotice();
    if (notice) toast.info(notice);

    return () => {
      stopReminders();
      stopSync();
    };
    // 空依賴陣列刻意如此：三個呼叫皆不讀取 mode/props，只在掛載時執行一次；
    // 模式切換一律會整頁重新導向（見 mode-actions.ts），此元件會整個重新掛載。
  }, []);

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
