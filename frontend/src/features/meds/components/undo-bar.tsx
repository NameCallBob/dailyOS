"use client";

import { Button } from "@/components/ui/button";
import { useRestoreItem } from "../hooks";
import { useMedsUiStore } from "../store";

/** 刪除藥物/保健品後的復原提示條，5 秒內可點擊復原。 */
export function MedsUndoBar() {
  const lastDeleted = useMedsUiStore((s) => s.lastDeleted);
  const restore = useRestoreItem();

  if (!lastDeleted) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-fit max-w-[92vw] items-center gap-3 rounded-full border border-line-strong bg-paper-raised px-4 py-2 shadow-md sm:bottom-6"
    >
      <span className="text-caption text-ink-soft">已刪除「{lastDeleted.item.name}」</span>
      <Button size="sm" variant="secondary" onClick={() => restore(lastDeleted.sourceType, lastDeleted.item)}>
        復原
      </Button>
    </div>
  );
}
