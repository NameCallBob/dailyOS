import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "發生錯誤",
  description = "資料載入失敗，請稍後再試一次。",
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-danger-soft bg-danger-soft/40 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-h3 text-ink">{title}</p>
      <p className="max-w-sm text-body text-ink-muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          重試
        </Button>
      ) : (
        action
      )}
    </div>
  );
}

export function OfflineState({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-line-strong bg-paper-sunken px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-h3 text-ink">目前離線</p>
      <p className="max-w-sm text-body text-ink-muted">
        已切換為離線瀏覽，部分資料可能不是最新版本；連線恢復後將自動同步。
      </p>
    </div>
  );
}
