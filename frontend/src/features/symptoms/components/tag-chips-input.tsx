"use client";

/**
 * tag-chips-input.tsx — 多選標籤輸入（用於誘因／緩解方式）。
 * 提供常用預設值快速點選，亦可輸入自訂文字後按 Enter/逗號新增。
 */

import { useId, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

export interface TagChipsInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  presets: readonly string[];
  placeholder?: string;
  className?: string;
}

export function TagChipsInput({ label, value, onChange, presets, placeholder, className }: TagChipsInputProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) return;
    if (value.length >= 10) return;
    onChange([...value, tag]);
  }

  function togglePreset(preset: string) {
    if (value.includes(preset)) {
      onChange(value.filter((t) => t !== preset));
    } else {
      addTag(preset);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
      setDraft("");
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const customTags = value.filter((t) => !presets.includes(t));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-label uppercase text-ink-muted">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const checked = value.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={checked}
              onClick={() => togglePreset(preset)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-caption transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                checked
                  ? "border-ink bg-ink text-paper"
                  : "border-line-strong text-ink-soft hover:bg-paper-sunken",
              )}
            >
              {preset}
            </button>
          );
        })}
      </div>
      {customTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {customTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft px-2.5 py-1 text-caption text-accent"
            >
              {tag}
              <button
                type="button"
                aria-label={`移除標籤 ${tag}`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="text-accent hover:opacity-70"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        id={inputId}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) {
            addTag(draft);
            setDraft("");
          }
        }}
        placeholder={placeholder ?? "輸入後按 Enter 新增自訂項目"}
        className={cn(
          "h-9 rounded-md border border-line-strong bg-paper px-3 text-body text-ink placeholder:text-ink-faint",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        )}
      />
    </div>
  );
}
