"use client";

/**
 * features/calendar/undo-bar.tsx — 刪除事件後的復原列（共用 toast 元件僅支援文字訊息，
 * 本模組刪除需要可點擊的「復原」動作，因此在模組內自建，不修改共用 components/ui/toast.tsx）。
 */
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

export interface UndoBarProps {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
  durationMs?: number;
}

export function UndoBar({ message, onUndo, onExpire, durationMs = 6000 }: UndoBarProps) {
  const [remaining, setRemaining] = useState(durationMs);

  useEffect(() => {
    const start = Date.now();
    const interval = window.setInterval(() => {
      const left = durationMs - (Date.now() - start);
      if (left <= 0) {
        window.clearInterval(interval);
        setRemaining(0);
        onExpire();
      } else {
        setRemaining(left);
      }
    }, 200);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto fixed inset-x-0 bottom-20 z-[90] mx-auto flex w-full max-w-sm items-center justify-between gap-4 rounded-md border border-line-strong bg-paper-raised px-4 py-3 text-body shadow-lg sm:bottom-6",
      )}
    >
      <span className="text-ink">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 text-body font-medium text-accent underline underline-offset-2 hover:opacity-80"
      >
        復原（{Math.ceil(remaining / 1000)}s）
      </button>
    </div>
  );
}
