/**
 * features/reminders/capabilities.ts — 誠實的平台能力偵測。
 *
 * 純本機（trial / local）模式下，「App 完全關閉」時只有 Chromium 系（Chrome / Edge，
 * 桌面與 Android）透過 Notification Triggers（TimestampTrigger）能可靠地預約通知；
 * Safari（macOS 與 iOS）完全不支援 Notification Triggers，也不支援背景 Web Push 於
 * 未登入狀態下運作 —— 必須「登入雲端（auth 模式）」由後端排程 Web Push 才能在關閉
 * App 後收到提醒。App 開啟中，所有主流瀏覽器皆可用 in-app 排程器可靠觸發。
 *
 * 本檔絕不宣稱「已可在關閉後提醒」除非實際偵測到 showTrigger 支援 —— UI 文案需直接
 * 呈現 canRemindWhenClosed 的真實值，不得美化。
 */

import { DEFAULT_CAPABILITIES, type NotificationPermissionState, type ReminderCapabilities } from "./types";

function detectIsSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Safari UA 含 "Safari" 但不含 "Chrome"/"Chromium"/"Edg"/"OPR"；
  // Chrome for iOS (CriOS) 與 Firefox for iOS (FxiOS) 底層雖也是 WebKit，
  // 仍歸類為「非 Safari」，因其 UA 可明確辨識，未來若該平台開放差異化 API 行為時較不易誤判。
  const isAppleWebkitBrowser = /Safari/.test(ua) && !/Chrome|Chromium|Edg\/|OPR\/|CriOS|FxiOS/.test(ua);
  return isAppleWebkitBrowser;
}

function detectPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const value = Notification.permission;
  if (value === "granted" || value === "denied" || value === "default") return value;
  return "unsupported";
}

function detectSupportsTriggers(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    return "showTrigger" in Notification.prototype;
  } catch {
    return false;
  }
}

async function detectServiceWorkerReady(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration);
  } catch {
    return false;
  }
}

/**
 * 偵測目前瀏覽器的提醒能力。可於任意時機呼叫（例如使用者點擊「開啟提醒」前後皆可
 * 重新偵測，因為 permission 可能改變）。SSR 環境回傳保守的 DEFAULT_CAPABILITIES。
 */
export async function detectReminderCapabilities(): Promise<ReminderCapabilities> {
  if (typeof window === "undefined") return DEFAULT_CAPABILITIES;

  const notificationSupported = "Notification" in window;
  const permission = detectPermission();
  const supportsTriggers = detectSupportsTriggers();
  const isSafari = detectIsSafari();
  const serviceWorkerReady = await detectServiceWorkerReady();

  // 「關閉 App 後仍可靠提醒」需同時滿足：支援通知、已授權、支援 Triggers、且 SW 已就緒。
  const canRemindWhenClosed = notificationSupported && permission === "granted" && supportsTriggers && serviceWorkerReady;

  return {
    notificationSupported,
    permission,
    supportsTriggers,
    isSafari,
    serviceWorkerReady,
    canRemindWhenClosed,
  };
}
