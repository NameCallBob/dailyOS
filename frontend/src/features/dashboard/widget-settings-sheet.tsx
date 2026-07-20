"use client";

import { Sheet } from "@/components/ui/sheet";
import type { DashboardWidgetConfig } from "./types";
import { WIDGET_META } from "./layout";

export interface WidgetSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  widgets: DashboardWidgetConfig[];
  onChange: (widgets: DashboardWidgetConfig[]) => void;
  saving?: boolean;
}

function normalizeOrder(widgets: DashboardWidgetConfig[]): DashboardWidgetConfig[] {
  return widgets
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((w, index) => ({ ...w, order: index }));
}

export function WidgetSettingsSheet({ open, onClose, widgets, onChange, saving }: WidgetSettingsSheetProps) {
  const ordered = widgets.slice().sort((a, b) => a.order - b.order);

  function toggleVisible(key: string) {
    onChange(widgets.map((w) => (w.key === key ? { ...w, visible: !w.visible } : w)));
  }

  function move(key: string, direction: -1 | 1) {
    const index = ordered.findIndex((w) => w.key === key);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
    const next = ordered.slice();
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(swapIndex, 0, item);
    onChange(normalizeOrder(next));
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="自訂總覽版面"
      description="顯示、隱藏或調整小工具的排列順序，變更會即時儲存。"
    >
      <ul className="flex flex-col gap-2" aria-busy={saving || undefined}>
        {ordered.map((widget, index) => {
          const meta = WIDGET_META[widget.key];
          return (
            <li
              key={widget.key}
              className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label={`將「${meta.title}」上移`}
                  disabled={index === 0}
                  onClick={() => move(widget.key, -1)}
                  className="px-1 text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`將「${meta.title}」下移`}
                  disabled={index === ordered.length - 1}
                  onClick={() => move(widget.key, 1)}
                  className="px-1 text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-body text-ink">{meta.title}</span>
                <span className="text-caption text-ink-muted">{meta.description}</span>
              </div>
              <label className="flex items-center gap-2 text-caption text-ink-soft">
                <span className="sr-only">顯示「{meta.title}」</span>
                <input
                  type="checkbox"
                  checked={widget.visible}
                  onChange={() => toggleVisible(widget.key)}
                  className="h-4 w-4 accent-ink"
                />
                {widget.visible ? "顯示" : "隱藏"}
              </label>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
