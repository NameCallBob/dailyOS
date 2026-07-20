"use client";

import { cn } from "@/lib/cn";

export interface SyncToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

/** 簡易可鍵盤操作的開關（role="switch"），沿用既有 design token，不引入新元件庫。 */
export function SyncToggle({ checked, onChange, disabled, label }: SyncToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-ink bg-ink" : "border-line-strong bg-paper-sunken",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-paper shadow-sm transition-transform duration-150 motion-reduce:transition-none",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
