"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveConflict } from "../conflict";
import type { SyncConflictRecord } from "../types";
import { ConflictSheet } from "./conflict-sheet";

export interface ConflictListProps {
  conflicts: SyncConflictRecord[];
}

/** 待手動處理的衝突清單（目前僅 notes 類資源會產生）。 */
export function ConflictList({ conflicts }: ConflictListProps) {
  const [openId, setOpenId] = useState<string | undefined>(undefined);
  const openConflict = conflicts.find((c) => c.id === openId);

  if (conflicts.length === 0) {
    return (
      <EmptyState
        title="目前沒有需要手動處理的衝突"
        description="筆記等自由文字資源若在多裝置間被同時修改，會顯示在這裡，等待你手動選擇要保留的版本。"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {conflicts.map((conflict) => {
          const title =
            typeof conflict.localRecord.title === "string" && conflict.localRecord.title
              ? conflict.localRecord.title
              : conflict.recordId;
          return (
            <li
              key={conflict.id}
              className="flex items-center justify-between gap-3 rounded-md border border-line bg-paper-raised p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone="warning">衝突</Badge>
                  <span className="truncate text-body text-ink">{title}</span>
                </div>
                <p className="mt-0.5 text-caption text-ink-muted">
                  資源：{conflict.resource} · 偵測於 {new Date(conflict.detectedAt).toLocaleString("zh-TW", { hour12: false })}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setOpenId(conflict.id)}>
                查看並處理
              </Button>
            </li>
          );
        })}
      </ul>

      <ConflictSheet
        conflict={openConflict}
        onClose={() => setOpenId(undefined)}
        onResolve={(id, resolution) => resolveConflict(id, resolution)}
      />
    </div>
  );
}
