"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";

import { submitQuickAdd } from "./actions";
import { parseQuickAdd, QUICK_ADD_CATEGORIES, type QuickAddCategory } from "./parse";
import { useQuickAddStore } from "./store";

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "解析信心：高",
  medium: "解析信心：中，請確認",
  low: "解析信心：低，請確認或修改",
};

export function QuickAdd() {
  const open = useQuickAddStore((s) => s.open);
  const show = useQuickAddStore((s) => s.show);
  const hide = useQuickAddStore((s) => s.hide);

  const [text, setText] = useState("");
  const [categoryOverride, setCategoryOverride] = useState<QuickAddCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 全域鍵盤快捷鍵：Cmd/Ctrl+K 或 "n"（未聚焦於輸入欄位時）開啟 Quick Add
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        show();
        return;
      }
      if (!isTyping && event.key.toLowerCase() === "n") {
        event.preventDefault();
        show();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [show]);

  const parsed = useMemo(() => parseQuickAdd(text), [text]);
  const category = categoryOverride ?? parsed.category;
  const categoryLabel = QUICK_ADD_CATEGORIES.find((c) => c.value === category)?.label ?? "";

  // 關閉時一併重置表單，避免下次開啟殘留上一次輸入。
  function closeAndReset() {
    hide();
    setText("");
    setCategoryOverride(null);
    setSubmitting(false);
  }

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await submitQuickAdd({
        category,
        title: parsed.title || text,
        when: parsed.when,
        amountMl: parsed.amountMl,
        weightKg: parsed.weightKg,
      });
      toast.success(`已新增「${categoryLabel}」`);
      closeAndReset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "新增失敗，請再試一次。");
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={closeAndReset}
      title="快速新增"
      description="輸入一句話，系統會嘗試判斷類型與內容；請於送出前確認預覽。"
    >
      <div className="flex flex-col gap-4">
        <Input
          autoFocus
          label="內容"
          placeholder="例如：明天下午三點回診 / 喝水500毫升 / 體重70公斤"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
        />

        <div className="flex flex-col gap-2">
          <span className="text-label uppercase text-ink-muted">類型</span>
          <Segmented
            label="選擇類型"
            value={category}
            onChange={(value) => setCategoryOverride(value as QuickAddCategory)}
            options={QUICK_ADD_CATEGORIES}
            className="flex-wrap"
          />
        </div>

        {text.trim() ? (
          <div className="rounded-md border border-line bg-paper-sunken p-3">
            <p className="text-body text-ink">{parsed.summary}</p>
            <p className="mt-1 text-caption text-ink-muted">{CONFIDENCE_LABEL[parsed.confidence]}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={closeAndReset} disabled={submitting}>
          取消
        </Button>
        <Button onClick={handleSubmit} loading={submitting} disabled={!text.trim()}>
          新增
        </Button>
      </div>
    </Sheet>
  );
}
