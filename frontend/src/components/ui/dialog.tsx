"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { useFocusTrap } from "./use-focus-trap";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, footer, className }: DialogProps) {
  const containerRef = useFocusTrap(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink/40 motion-reduce:animate-none"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-lg animate-slide-up rounded-lg border border-line bg-paper-raised p-6 shadow-lg motion-reduce:animate-none",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-h2 text-ink">
              {title}
            </h2>
            {description ? (
              <p id="dialog-description" className="mt-1 text-caption text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉對話框"
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
