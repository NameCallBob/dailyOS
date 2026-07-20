"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { DataTransferSection } from "@/features/data-transfer/components/data-transfer-section";
import { RemindersSection } from "@/features/reminders";
import { SyncSection } from "@/features/sync";
import type { DaiosMode } from "@/lib/mode";

export interface DataSyncSectionProps {
  mode: DaiosMode;
}

/**
 * 設定頁「資料、提醒與同步」分頁：整合三個獨立模組——
 * 匯出/匯入（data-transfer）、本機提醒（reminders）、雲端同步（sync）。
 *
 * 三者皆以本機 Dexie 資料為前提，僅在 trial / local（isLocalData）模式下有意義；
 * 雲端（auth）模式資料已直接存於伺服器、跨裝置同步，這裡改顯示說明文字，
 * 不誆稱這些本機專屬工具在雲端模式下可用。
 */
export function DataSyncSection({ mode }: DataSyncSectionProps) {
  if (mode === "auth") {
    return (
      <EmptyState
        title="雲端模式不需要本機資料工具"
        description="你的資料已直接存在伺服器並跨裝置同步。本機匯出/匯入、提醒排程與同步設定僅適用於試用或本機模式；雲端模式的提醒推播由後端負責（尚未串接），與此處的本機排程器無關。"
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h3 className="text-label uppercase text-ink-muted">資料備份與攜帶</h3>
        <DataTransferSection />
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-8">
        <h3 className="text-label uppercase text-ink-muted">本機提醒</h3>
        <RemindersSection />
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-8">
        <h3 className="text-label uppercase text-ink-muted">雲端同步</h3>
        <SyncSection />
      </section>
    </div>
  );
}
