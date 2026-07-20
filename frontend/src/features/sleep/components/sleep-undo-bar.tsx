"use client";

import { Button } from "@/components/ui/button";

export interface SleepUndoBarProps {
  label: string;
  onUndo: () => void;
}

/** 刪除後短暫顯示的復原列。 */
export function SleepUndoBar({ label, onUndo }: SleepUndoBarProps) {
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-fit max-w-[92vw] items-center gap-3 rounded-md border border-line-strong bg-paper-raised px-4 py-2.5 shadow-md sm:bottom-6"
    >
      <span className="text-caption text-ink">已刪除「{label}」</span>
      <Button type="button" size="sm" variant="secondary" onClick={onUndo}>
        復原
      </Button>
    </div>
  );
}
