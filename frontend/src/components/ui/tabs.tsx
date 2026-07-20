"use client";

import { useId, useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** 標準 tabs：方向鍵切換、Home/End 跳首尾，roving tabindex。 */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  const groupId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function focusIndex(index: number) {
    const item = items[index];
    if (!item) return;
    onChange(item.value);
    refs.current[item.value]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = items.findIndex((item) => item.value === value);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusIndex((currentIndex + 1 + items.length) % items.length);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusIndex((currentIndex - 1 + items.length) % items.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusIndex(items.length - 1);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="分頁"
      onKeyDown={handleKeyDown}
      className={cn("flex gap-1 border-b border-line", className)}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[item.value] = el;
            }}
            id={`${groupId}-tab-${item.value}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-body transition-colors",
              selected ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
