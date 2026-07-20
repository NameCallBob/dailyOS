/**
 * public/reminders-sw.js — DailyOS 本機提醒的 Service Worker 行為（notificationclick）。
 *
 * 這個檔案刻意獨立於 public/sw.js（app shell 快取邏輯）之外，避免提醒模組的 agent
 * 直接修改共用的 sw.js。整合方式（擇一，由整合階段的主 agent 決定）：
 *
 *   方式 A（建議）：在 public/sw.js 檔案最上方加入
 *     importScripts("/reminders-sw.js");
 *   兩個檔案都是 classic（非 module）service worker script，importScripts 可直接運作，
 *   彼此的 self.addEventListener 呼叫會疊加（fetch/install/activate 事件互不影響，
 *   notificationclick 事件目前只有本檔監聽，不會衝突）。
 *
 *   方式 B：將本檔的 notificationclick 監聽器內容手動搬進 public/sw.js。
 *
 *   方式 C（不需改 sw.js）：什麼都不做也能運作——registration.showNotification() /
 *   showTrigger 本身不需要 notificationclick 監聽器就能「跳出通知」；只有點擊通知上
 *   的「延後 10 分鐘」動作按鈕、或點擊通知本體聚焦視窗，才需要這裡的邏輯。若不整合，
 *   使用者點通知只會有瀏覽器預設行為（通常是直接關閉，不會聚焦分頁）。
 *
 * 注意：Service Worker 沒有 window.localStorage，因此「延後(snooze)」直接在這裡用
 * showTrigger 重新預約一則新通知，不依賴 features/reminders/dedupe.ts 的
 * localStorage 記錄（那份記錄只給「App 開啟時」的 in-app 排程器使用）。
 */

const SNOOZE_MINUTES = 10;

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  const href = typeof data.href === "string" ? data.href : "/";

  notification.close();

  if (event.action === "snooze") {
    event.waitUntil(snoozeNotification(notification, data));
    return;
  }

  // 預設點擊（含 "dismiss" 動作、或直接點通知本體）：聚焦既有分頁或開新分頁。
  event.waitUntil(focusOrOpen(href));
});

async function snoozeNotification(notification, data) {
  const dueMs = Date.now() + SNOOZE_MINUTES * 60_000;
  const options = {
    body: notification.body,
    tag: notification.tag,
    icon: notification.icon,
    badge: notification.badge,
    data,
    actions: [
      { action: "snooze", title: `延後 ${SNOOZE_MINUTES} 分鐘` },
      { action: "dismiss", title: "知道了" },
    ],
  };

  const supportsTriggers = "showTrigger" in Notification.prototype && typeof TimestampTrigger !== "undefined";
  if (supportsTriggers) {
    options.showTrigger = new TimestampTrigger(dueMs);
    await self.registration.showNotification(notification.title, options);
    return;
  }

  // 不支援 Triggers：無法在背景等待，退而求其次立即重新提醒一次，
  // 讓使用者至少知道「這則提醒還在」，而不是靜默消失。
  await self.registration.showNotification(notification.title, options);
}

async function focusOrOpen(href) {
  const url = new URL(href, self.location.origin).href;
  const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of allClients) {
    if (client.url === url && "focus" in client) {
      return client.focus();
    }
  }
  const sameOrigin = allClients.find((c) => "focus" in c);
  if (sameOrigin) {
    await sameOrigin.focus();
    if ("navigate" in sameOrigin) return sameOrigin.navigate(url);
    return sameOrigin;
  }
  return self.clients.openWindow(url);
}
