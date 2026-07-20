"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";

export type ToastTone = "neutral" | "success" | "danger";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  duration: number;
}

type Listener = () => void;

/** 穩定的空陣列常數；SSR snapshot 必須回傳同一個參考，否則 useSyncExternalStore 會判定為無限迴圈。 */
const EMPTY: ToastItem[] = [];

let items: ToastItem[] = EMPTY;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return items;
}

function getServerSnapshot(): ToastItem[] {
  return EMPTY;
}

function push(message: string, tone: ToastTone, duration = 4000) {
  const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  items = [...items, { id, message, tone, duration }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => dismiss(id), duration);
  }
  return id;
}

function dismiss(id: string) {
  items = items.filter((item) => item.id !== id);
  emit();
}

/** 全域可呼叫的 imperative toast API：toast.success()/error()/info() */
export const toast = {
  success: (message: string, duration?: number) => push(message, "success", duration),
  error: (message: string, duration?: number) => push(message, "danger", duration),
  info: (message: string, duration?: number) => push(message, "neutral", duration),
  dismiss,
};

const toneClasses: Record<ToastTone, string> = {
  neutral: "border-line-strong bg-paper-raised text-ink",
  success: "border-success-soft bg-success-soft text-success",
  danger: "border-danger-soft bg-danger-soft text-danger",
};

export function Toaster() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6"
    >
      {current.map((item) => (
        <div
          key={item.id}
          role={item.tone === "danger" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto w-full max-w-sm animate-slide-up rounded-md border px-4 py-3 text-body shadow-md motion-reduce:animate-none",
            toneClasses[item.tone],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <p>{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="關閉通知"
              className="text-ink-muted hover:text-ink"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
