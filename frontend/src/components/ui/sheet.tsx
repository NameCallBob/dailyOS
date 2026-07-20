"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { useFocusTrap } from "./use-focus-trap";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** 手機優先的底部抽屜（BottomSheet），桌面尺寸會置中呈現同一內容。 */
export function Sheet({ open, onClose, title, description, children, footer, className }: SheetProps) {
  const containerRef = useFocusTrap(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink/40 motion-reduce:animate-none"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        aria-describedby={description ? "sheet-description" : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 max-h-[85vh] w-full animate-slide-up overflow-y-auto rounded-t-xl border border-line bg-paper-raised p-6 shadow-lg motion-reduce:animate-none",
          "sm:max-w-lg sm:rounded-xl",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="sheet-title" className="text-h2 text-ink">
              {title}
            </h2>
            {description ? (
              <p id="sheet-description" className="mt-1 text-caption text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="rounded-md p-1 text-ink-muted hover:bg-paper-sunken hover:text-ink"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
