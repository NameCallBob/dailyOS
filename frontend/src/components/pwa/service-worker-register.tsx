"use client";

import { useEffect } from "react";

/** 於瀏覽器環境註冊 service worker，提供離線快取與安裝能力。 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 靜默失敗：PWA 能力為漸進增強，不影響核心功能。
    });
  }, []);

  return null;
}
