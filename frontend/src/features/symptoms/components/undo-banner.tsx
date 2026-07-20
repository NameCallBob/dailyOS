"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface UndoBannerProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  className?: string;
}

/** 重要刪除後的復原列（搭配 toast 一併使用；toast 不支援操作按鈕，故另以此列承載復原動作）。 */
export function UndoBanner({ message, onUndo, onDismiss, className }: UndoBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-line-strong bg-paper-sunken px-4 py-2.5 text-caption text-ink-soft",
        className,
      )}
    >
      <span>{message}</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onUndo}>
          復原
        </Button>
        <button type="button" onClick={onDismiss} aria-label="關閉復原提示" className="text-ink-muted hover:text-ink">
          ×
        </button>
      </div>
    </div>
  );
}
