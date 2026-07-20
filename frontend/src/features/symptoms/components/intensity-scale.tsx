"use client";

/**
 * intensity-scale.tsx — 0-10 強度量表選擇器（全站健康模組一致的量表）。
 * 狀態不僅靠顏色：以外框粗細 + 底色 + 選取符號區分，並支援方向鍵移動。
 */

import { useId, useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";
import { INTENSITY_ANCHOR_LABELS, INTENSITY_MAX, INTENSITY_MIN } from "../constants";
import { intensityTone } from "../utils";

export interface IntensityScaleProps {
  value: number | undefined;
  onChange: (value: number) => void;
  error?: string;
  className?: string;
}

const toneClasses: Record<ReturnType<typeof intensityTone>, string> = {
  neutral: "border-line-strong text-ink-soft",
  warning: "border-warning text-warning",
  danger: "border-danger text-danger",
};

export function IntensityScale({ value, onChange, error, className }: IntensityScaleProps) {
  const groupId = useId();
  const refs = useRef<Record<number, HTMLButtonElement | null>>({});
  const options = Array.from({ length: INTENSITY_MAX - INTENSITY_MIN + 1 }, (_, i) => INTENSITY_MIN + i);

  function focusIndex(index: number) {
    const target = options[index];
    if (target === undefined) return;
    onChange(target);
    refs.current[target]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = options.findIndex((o) => o === value);
    const idx = currentIndex === -1 ? 0 : currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      focusIndex(Math.min(idx + 1, options.length - 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      focusIndex(Math.max(idx - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      focusIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusIndex(options.length - 1);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span id={`${groupId}-label`} className="text-label uppercase text-ink-muted">
        強度（0-10）
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        aria-describedby={error ? `${groupId}-error` : undefined}
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-1.5"
      >
        {options.map((option) => {
          const checked = option === value;
          const tone = toneClasses[intensityTone(option)];
          return (
            <button
              key={option}
              ref={(el) => {
                refs.current[option] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (value === undefined && option === 0) ? 0 : -1}
              onClick={() => onChange(option)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md border text-numeric tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                checked ? cn("border-2 bg-paper-sunken font-semibold", tone) : "border-line-strong text-ink-soft hover:bg-paper-sunken",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-caption text-ink-faint">
        {Object.entries(INTENSITY_ANCHOR_LABELS).map(([key, label]) => (
          <span key={key}>{label}</span>
        ))}
      </div>
      {error ? (
        <p id={`${groupId}-error`} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
