"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { setSyncPreference, triggerSync } from "../engine";
import { useSyncConflicts, useSyncEligibility, useSyncQueue } from "../hooks";
import { useSyncStore } from "../store";
import { ConflictList } from "./conflict-list";
import { QueueStatus } from "./queue-status";
import { SyncToggle } from "./sync-toggle";

/**
 * 雲端同步設定區塊：僅本機（local）模式提供。試用模式資料本來就是 demo，
 * 登入（auth）模式資料本身即時存在伺服器，兩者皆不需要「另外開啟同步」。
 */
export function SyncSection() {
  const { isLocalMode, isLoggedIn } = useSyncEligibility();
  const queue = useSyncQueue();
  const conflicts = useSyncConflicts();
  const enabled = useSyncStore((s) => s.enabled);
  const syncing = useSyncStore((s) => s.syncing);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const lastError = useSyncStore((s) => s.lastError);
  const nextRetryAt = useSyncStore((s) => s.nextRetryAt);
  const online = useSyncStore((s) => s.online);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    function update() {
      useSyncStore.getState().setOnline(navigator.onLine);
    }
    update();
  }, []);

  if (!isLocalMode) {
    return (
      <EmptyState
        title="同步僅適用於本機模式"
        description="目前不是本機模式，不需要另外開啟雲端同步：試用模式的資料僅供評估、不會上傳；登入模式的資料本來就即時存在伺服器上。"
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <EmptyState
        title="登入後才能開啟雲端同步"
        description="本機模式下你的資料預設只存在這台裝置的瀏覽器裡。登入帳號後，可以選擇開啟同步，把資料備份並帶到其他裝置。"
        action={
          <Button variant="secondary" onClick={() => window.location.assign("/login")}>
            前往登入
          </Button>
        }
      />
    );
  }

  async function handleToggle(next: boolean) {
    setToggling(true);
    try {
      setSyncPreference(next);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-h3 text-ink">雲端同步</h3>
            <p className="mt-1 text-caption text-ink-muted">
              開啟後，這台裝置的變更會排入佇列並上傳，其他裝置的變更也會下載到本機。關閉時資料仍只保存在本機。
            </p>
          </div>
          <SyncToggle checked={enabled} onChange={(next) => void handleToggle(next)} disabled={toggling} label="開啟雲端同步" />
        </div>

        {enabled ? (
          <div>
            <Button variant="secondary" size="sm" loading={syncing} onClick={() => void triggerSync()}>
              立即同步
            </Button>
          </div>
        ) : null}
      </section>

      {enabled ? (
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h3 className="text-h3 text-ink">同步狀態</h3>
          {queue === undefined ? (
            <div className="flex items-center gap-2 text-caption text-ink-muted">
              <Spinner size="sm" />
              讀取佇列中…
            </div>
          ) : (
            <QueueStatus
              queue={queue}
              syncing={syncing}
              lastSyncedAt={lastSyncedAt}
              lastError={lastError}
              nextRetryAt={nextRetryAt}
              online={online}
            />
          )}
        </section>
      ) : null}

      {enabled ? (
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h3 className="text-h3 text-ink">待手動處理的衝突</h3>
          {conflicts === undefined ? (
            <div className="flex items-center gap-2 text-caption text-ink-muted">
              <Spinner size="sm" />
              讀取中…
            </div>
          ) : (
            <ConflictList conflicts={conflicts} />
          )}
        </section>
      ) : null}
    </div>
  );
}
