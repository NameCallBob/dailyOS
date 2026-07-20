"use client";

import { useState, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface TagEditorProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

/** 標籤編輯器：輸入後按 Enter / 逗號新增，點 x 移除。 */
export function TagEditor({ value, onChange }: TagEditorProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const next = draft.trim();
    if (!next) return;
    if (!value.includes(next)) onChange([...value, next]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="note-tag-input" className="text-label uppercase text-ink-muted">
        標籤
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line-strong bg-paper px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent">
        {value.map((tag) => (
          <Badge key={tag} tone="accent" withGlyph={false}>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`移除標籤 ${tag}`}
              className="ml-1 text-ink-faint hover:text-ink"
            >
              ×
            </button>
          </Badge>
        ))}
        <Input
          id="note-tag-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={value.length === 0 ? "輸入標籤後按 Enter" : "新增標籤…"}
          className="h-7 flex-1 border-none px-1 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
