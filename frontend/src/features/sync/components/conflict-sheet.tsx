"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { SyncConflictRecord } from "../types";

export interface ConflictSheetProps {
  conflict: SyncConflictRecord | undefined;
  onClose: () => void;
  onResolve: (id: string, resolution: "keep_server" | "keep_local") => Promise<void>;
}

function pickPreview(record: Record<string, unknown>): { title: string; body: string } {
  const title = typeof record.title === "string" && record.title ? record.title : "(無標題)";
  const body = typeof record.content === "string" ? record.content : JSON.stringify(record, null, 2);
  return { title, body };
}

/** 手機優先的底部抽屜：並排顯示本地 / 伺服器兩版內容，讓使用者手動選擇，不自動合併。 */
export function ConflictSheet({ conflict, onClose, onResolve }: ConflictSheetProps) {
  const [resolving, setResolving] = useState<"keep_server" | "keep_local" | null>(null);

  if (!conflict) return null;

  const local = pickPreview(conflict.localRecord);
  const server = pickPreview(conflict.serverRecord);

  async function handleResolve(resolution: "keep_server" | "keep_local") {
    if (!conflict) return;
    setResolving(resolution);
    try {
      await onResolve(conflict.id, resolution);
      onClose();
    } finally {
      setResolving(null);
    }
  }

  return (
    <Sheet
      open={Boolean(conflict)}
      onClose={onClose}
      title="這筆筆記在其他地方也被修改過"
      description="為避免內容被無聲覆蓋，請手動選擇要保留哪一版；也可以先取消，之後再回來處理。"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={resolving !== null}>
            稍後再處理
          </Button>
          <Button
            variant="secondary"
            loading={resolving === "keep_server"}
            disabled={resolving !== null}
            onClick={() => void handleResolve("keep_server")}
          >
            保留伺服器版本
          </Button>
          <Button
            variant="primary"
            loading={resolving === "keep_local"}
            disabled={resolving !== null}
            onClick={() => void handleResolve("keep_local")}
          >
            保留我的版本
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <section className="flex-1 rounded-md border border-line p-3">
          <h4 className="mb-1 text-label uppercase text-ink-muted">我的版本（本機）</h4>
          <p className="text-body font-medium text-ink">{local.title}</p>
          <p className="mt-1 whitespace-pre-wrap text-caption text-ink-muted">{local.body}</p>
        </section>
        <section className="flex-1 rounded-md border border-line p-3">
          <h4 className="mb-1 text-label uppercase text-ink-muted">伺服器版本</h4>
          <p className="text-body font-medium text-ink">{server.title}</p>
          <p className="mt-1 whitespace-pre-wrap text-caption text-ink-muted">{server.body}</p>
        </section>
      </div>
    </Sheet>
  );
}
