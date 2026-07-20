"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, OfflineState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import { useOnlineStatus } from "@/components/pwa/use-online-status";
import { medicationsRepo, supplementsRepo } from "../repo";
import { useMedsUiStore } from "../store";
import { SOURCE_TYPE_LABEL } from "../types";
import { DisclaimerBanner } from "./disclaimer-banner";
import { LogHistory } from "./log-history";
import { MedCard } from "./med-card";
import { MedFormSheet } from "./med-form-sheet";
import { RefillDialog } from "./refill-dialog";
import { TakeDoseDialog } from "./take-dose-dialog";
import { MedsUndoBar } from "./undo-bar";

const TAB_ITEMS = [
  { value: "medication", label: SOURCE_TYPE_LABEL.medication },
  { value: "supplement", label: SOURCE_TYPE_LABEL.supplement },
  { value: "logs", label: "服用紀錄" },
];

export function MedList() {
  const tab = useMedsUiStore((s) => s.tab);
  const setTab = useMedsUiStore((s) => s.setTab);
  const formOpen = useMedsUiStore((s) => s.formOpen);
  const formSourceType = useMedsUiStore((s) => s.formSourceType);
  const editingItemId = useMedsUiStore((s) => s.editingItemId);
  const openCreateForm = useMedsUiStore((s) => s.openCreateForm);
  const isOnline = useOnlineStatus();

  const medicationsQuery = medicationsRepo.useList({ ordering: "name", pageSize: 200 });
  const supplementsQuery = supplementsRepo.useList({ ordering: "name", pageSize: 200 });

  const activeQuery = tab === "medication" ? medicationsQuery : tab === "supplement" ? supplementsQuery : undefined;
  const items = activeQuery?.data?.results ?? [];
  const editingItem = editingItemId ? items.find((i) => i.id === editingItemId) : undefined;

  const allMedications = medicationsQuery.data?.results ?? [];
  const allSupplements = supplementsQuery.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">用藥</h1>
        <p className="text-caption text-ink-muted">記錄藥物與保健品的服用狀況、時段與庫存，養成穩定的用藥習慣。</p>
      </header>

      <DisclaimerBanner />

      {!isOnline ? <OfflineState /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs items={TAB_ITEMS} value={tab} onChange={(v) => setTab(v as typeof tab)} />
        {tab !== "logs" ? (
          <Button onClick={() => openCreateForm(tab)}>+ 新增{SOURCE_TYPE_LABEL[tab]}</Button>
        ) : null}
      </div>

      {tab === "logs" ? (
        <LogHistory />
      ) : activeQuery?.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-paper-raised py-16 text-ink-muted">
          <Spinner /> 載入{SOURCE_TYPE_LABEL[tab]}資料中…
        </div>
      ) : activeQuery?.isError ? (
        <ErrorState description={`${SOURCE_TYPE_LABEL[tab]}資料載入失敗，請稍後再試一次。`} onRetry={() => activeQuery?.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={`還沒有任何${SOURCE_TYPE_LABEL[tab]}`}
          description={`新增第一筆${SOURCE_TYPE_LABEL[tab]}，設定劑量與服用時段，開始追蹤與提醒。`}
          action={<Button onClick={() => openCreateForm(tab)}>+ 新增{SOURCE_TYPE_LABEL[tab]}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <MedCard key={item.id} sourceType={tab} item={item} />
          ))}
        </div>
      )}

      {formOpen ? <MedFormSheet sourceType={formSourceType} item={editingItem} /> : null}

      {allMedications.map((item) => (
        <TakeDoseDialog key={`dose-${item.id}`} sourceType="medication" item={item} />
      ))}
      {allSupplements.map((item) => (
        <TakeDoseDialog key={`dose-${item.id}`} sourceType="supplement" item={item} />
      ))}
      {allMedications.map((item) => (
        <RefillDialog key={`refill-${item.id}`} sourceType="medication" item={item} />
      ))}
      {allSupplements.map((item) => (
        <RefillDialog key={`refill-${item.id}`} sourceType="supplement" item={item} />
      ))}

      <MedsUndoBar />
    </div>
  );
}
