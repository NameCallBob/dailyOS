"use client";

import { useId, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

export interface TagInputProps {
  label?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

/** 食物標籤輸入：Enter / 逗號新增，Backspace 於空輸入時刪除最後一個標籤。 */
export function TagInput({ label, value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function commit(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (!value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-label uppercase text-ink-muted">
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-md border border-line-strong bg-paper px-2 py-1.5",
          "focus-within:ring-2 focus-within:ring-accent",
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-paper-sunken px-2 py-0.5 text-caption text-ink-soft"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`移除標籤 ${tag}`}
              className="text-ink-muted hover:text-ink"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          placeholder={value.length === 0 ? placeholder ?? "輸入後按 Enter 新增" : ""}
          className="h-7 min-w-[6rem] flex-1 border-none bg-transparent text-body text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </div>
    </div>
  );
}
