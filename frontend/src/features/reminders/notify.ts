/**
 * features/reminders/notify.ts — 瀏覽器通知 I/O：權限請求、立即發送、背景預約。
 *
 * 設計原則：
 * - requestPermission() 只能由使用者手勢（點擊「開啟提醒」）觸發，本檔不會自動呼叫。
 * - 優先透過 ServiceWorkerRegistration.showNotification() 發送（支援 actions 按鈕、
 *   且與 Notification Triggers 共用同一套 API）；若沒有已註冊的 Service Worker
 *   （例如尚未安裝 PWA 或瀏覽器不支援），退回 `new Notification()`，但此路徑只在
 *   分頁開啟時有效。
 * - Notification Triggers（showTrigger）為實驗性 API，型別故意以最小、非 any 的
 *   自訂介面描述，不依賴 lib.dom.d.ts 尚未收錄的型別。
 */

import type { ReminderItem } from "./types";

// ---------------------------------------------------------------------------
// Notification Triggers 的最小型別描述（實驗性 API，非標準 lib.dom）
// ---------------------------------------------------------------------------

interface TimestampTriggerConstructor {
  new (timestamp: number): unknown;
}

interface NotificationActionDescriptor {
  action: string;
  title: string;
  icon?: string;
}

/**
 * lib.dom.d.ts（本專案使用的 TypeScript 版本）尚未收錄 `actions` / `renotify` /
 * `showTrigger` 這幾個屬性（皆為較新或實驗性的 Notification / Service Worker
 * showNotification 擴充選項），因此在此自行補上型別，避免使用 `any`。
 */
interface ExperimentalNotificationOptions extends NotificationOptions {
  showTrigger?: unknown;
  renotify?: boolean;
  actions?: NotificationActionDescriptor[];
}

function getTimestampTriggerCtor(): TimestampTriggerConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { TimestampTrigger?: TimestampTriggerConstructor };
  return w.TimestampTrigger;
}

export function supportsNotificationTriggers(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    return "showTrigger" in Notification.prototype && Boolean(getTimestampTriggerCtor());
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 權限
// ---------------------------------------------------------------------------

/** 只能在使用者手勢（例如按鈕 onClick）中呼叫，瀏覽器會直接拒絕非手勢觸發的請求。 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// ---------------------------------------------------------------------------
// 取得可用的 Service Worker registration（不主動註冊；沿用 App Shell 既有的 /sw.js 註冊）
// ---------------------------------------------------------------------------

async function getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return undefined;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    // 給一個短暫的機會等待安裝中的註冊完成，避免 App 剛啟動時誤判為「不支援」。
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1500)),
    ]);
  } catch {
    return undefined;
  }
}

function buildNotificationOptions(item: ReminderItem, tag: string): ExperimentalNotificationOptions {
  return {
    body: item.body,
    tag,
    // 同一 tag 的舊通知會被取代，避免同一提醒因重掃而重複疊加。
    renotify: false,
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    data: { href: item.href ?? "/", dedupeKey: item.dedupeKey, kind: item.kind },
    actions: [
      { action: "snooze", title: "延後 10 分鐘" },
      { action: "dismiss", title: "知道了" },
    ],
  };
}

/** 立即發送一則通知（用於「到期」項目與測試通知）。回傳是否成功送出。 */
export async function showReminderNotification(item: ReminderItem): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const options = buildNotificationOptions(item, item.dedupeKey);
  const registration = await getRegistration();
  try {
    if (registration) {
      await registration.showNotification(item.title, options);
    } else {
      // 退回頁面內建構子；僅在分頁開啟時有效，沒有 actions 按鈕支援。
      new Notification(item.title, { body: options.body, icon: options.icon, tag: options.tag });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 嘗試以 Notification Triggers 預約未來通知（App 關閉後仍可能觸發，僅 Chromium）。
 * 回傳是否成功預約；失敗（不支援 / 無 SW / API 拋出例外）一律回傳 false，呼叫端應
 * 誠實地不宣稱「已預約成功」。
 */
export async function scheduleBackgroundTrigger(item: ReminderItem): Promise<boolean> {
  if (!supportsNotificationTriggers()) return false;
  const registration = await getRegistration();
  if (!registration) return false;

  const TimestampTrigger = getTimestampTriggerCtor();
  if (!TimestampTrigger) return false;

  const dueMs = new Date(item.dueAt).getTime();
  if (Number.isNaN(dueMs) || dueMs <= Date.now()) return false;

  const options = buildNotificationOptions(item, item.dedupeKey);
  options.showTrigger = new TimestampTrigger(dueMs);

  try {
    await registration.showNotification(item.title, options);
    return true;
  } catch {
    return false;
  }
}

/** 取消已預約但尚未觸發的通知（例如來源資料被刪除或改期）。 */
export async function cancelScheduledNotification(dedupeKey: string): Promise<void> {
  const registration = await getRegistration();
  if (!registration) return;
  try {
    const pending = await registration.getNotifications({ tag: dedupeKey });
    for (const n of pending) n.close();
  } catch {
    // 忽略：清不掉舊的預約不影響下一輪重新排程。
  }
}

/** 設定頁「測試通知」按鈕：立即發一則範例通知，不受頻道開關 / 安靜時段影響。 */
export async function sendTestNotification(): Promise<boolean> {
  return showReminderNotification({
    dedupeKey: `test:${Date.now()}`,
    kind: "task",
    sourceId: "test",
    title: "DailyOS 測試通知",
    body: "如果你看到這則通知，代表本機提醒已可正常運作。",
    dueAt: new Date().toISOString(),
    href: "/settings",
  });
}
