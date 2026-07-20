"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface UndoBannerProps {
  message: string;
  seconds?: number;
  onUndo: () => void;
  onExpire: () => void;
  className?: string;
}

/**
 * 重要刪除的 Undo 提示條：非全域 Toast（元件庫的 toast 不支援互動按鈕），
 * 因此在模組內自行實作一個帶倒數與復原按鈕的區域性提示。
 */
export function UndoBanner({ message, seconds = 6, onUndo, onExpire, className }: UndoBannerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const timer = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, onExpire]);

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-line-strong bg-paper-raised px-4 py-2.5 shadow-md",
        className,
      )}
    >
      <span className="text-body text-ink">
        {message}（<span className="tabular-nums">{remaining}</span> 秒後生效）
      </span>
      <Button size="sm" variant="secondary" onClick={onUndo}>
        復原
      </Button>
    </div>
  );
}
