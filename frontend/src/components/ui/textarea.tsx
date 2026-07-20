"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const areaId = id ?? generatedId;
    const hintId = hint ? `${areaId}-hint` : undefined;
    const errorId = error ? `${areaId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={areaId} className="text-label uppercase text-ink-muted">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={areaId}
          rows={rows}
          className={cn(
            "rounded-md border border-line-strong bg-paper px-3 py-2 text-body text-ink placeholder:text-ink-faint",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            error && "border-danger",
            className,
          )}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={cn(hintId, errorId) || undefined}
          {...props}
        />
        {hint && !error ? (
          <p id={hintId} className="text-caption text-ink-muted">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
