/**
 * DailyOS service worker — 最小可用版本。
 * 快取 app shell 靜態資源，離線時提供基本回退；API 一律走網路（試用模式資料在 IndexedDB，不受影響）。
 *
 * importScripts 掛載 reminders-sw.js（本機提醒的 notificationclick 行為，見該檔頂部註解的
 * 「方式 A」）：兩份 classic service worker script 的 self.addEventListener 呼叫會疊加，
 * fetch/install/activate（本檔）與 notificationclick（reminders-sw.js）互不衝突。
 */

// 由 SW 自身位置推導 base（GitHub Pages 專案站台 → "/dailyOS/"；本機 → "/"），
// 讓快取與 importScripts 路徑在有無 basePath 時都正確。
const BASE = self.location.pathname.replace(/sw\.js$/, "");

importScripts(`${BASE}reminders-sw.js`);

const CACHE_NAME = "dailyos-shell-v1";
const APP_SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icons/icon.svg`];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // API 一律走網路

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
