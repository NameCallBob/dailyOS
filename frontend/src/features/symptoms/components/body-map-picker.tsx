"use client";

/**
 * body-map-picker.tsx — 人體區域選擇器。
 *
 * 設計原則：提供選擇但「不阻礙快速紀錄」——預設以 <details> 收合，
 * 使用者可以完全略過此步驟直接送出紀錄；展開後以粗略人體輪廓排列的
 * 按鈕格供快速點選，亦可清除已選區域。
 */

import { useId } from "react";

import { cn } from "@/lib/cn";
import { BODY_MAP_LAYOUT, BODY_REGION_LABELS, type BodyRegionKey } from "../constants";

export interface BodyMapPickerProps {
  value: BodyRegionKey | string | undefined;
  onChange: (value: BodyRegionKey | undefined) => void;
  className?: string;
  defaultOpen?: boolean;
}

export function BodyMapPicker({ value, onChange, className, defaultOpen = false }: BodyMapPickerProps) {
  const groupId = useId();
  const selectedLabel = value && value in BODY_REGION_LABELS ? BODY_REGION_LABELS[value as BodyRegionKey] : value;

  return (
    <details className={cn("group rounded-md border border-line-strong", className)} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-body text-ink">
        <span className="flex items-center gap-2">
          <span className="text-label uppercase text-ink-muted">部位（選填）</span>
          {selectedLabel ? <span className="text-caption text-ink-soft">已選：{selectedLabel}</span> : null}
        </span>
        <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="border-t border-line px-3 py-3">
        <div
          role="radiogroup"
          aria-label="人體部位"
          id={groupId}
          className="mx-auto grid max-w-xs grid-cols-3 gap-1.5"
        >
          {BODY_MAP_LAYOUT.flat().map((region, index) => {
            if (region === null) {
              return <span key={`empty-${index}`} aria-hidden />;
            }
            const checked = value === region;
            return (
              <button
                key={region}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onChange(checked ? undefined : region)}
                className={cn(
                  "rounded-md border px-1.5 py-2 text-center text-[0.7rem] leading-tight transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  checked
                    ? "border-2 border-ink bg-paper-sunken font-semibold text-ink"
                    : "border-line-strong text-ink-muted hover:bg-paper-sunken hover:text-ink",
                )}
              >
                {BODY_REGION_LABELS[region]}
              </button>
            );
          })}
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="mt-2 text-caption text-ink-muted underline hover:text-ink"
          >
            清除已選部位
          </button>
        ) : (
          <p className="mt-2 text-caption text-ink-faint">此為粗略輪廓示意，非精確醫學圖。點選一個部位即可，可略過。</p>
        )}
      </div>
    </details>
  );
}
