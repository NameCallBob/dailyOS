/** @type {import('next').NextConfig} */

/*
 * 兩種建置目標：
 *
 * 1) 預設（伺服器渲染）：`next dev` / `next build` / `next start`。
 *    保留 middleware（三模式路由守門 trial/local/auth 的關鍵），也相容之後的 Django 後端 auth 模式。
 *    安裝為 PWA 靠 manifest + service worker，不需要靜態匯出。
 *
 * 2) 可攜的靜態匯出：`STATIC_EXPORT=1 next build` → 產生純 HTML/JS 到 out/，
 *    可直接放上 GitHub Pages 或打包下載離線使用。此模式下 Next 不執行 middleware，
 *    改由 (app) 版面的 client-side 守門（getMode()）處理，行為對純本機資料模式等價。
 *
 * 靜態匯出才套用 basePath（GitHub Pages 專案站台服務於子路徑）。
 */
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = staticExport ? process.env.BASE_PATH ?? "/dailyOS" : "";

const nextConfig = {
  reactStrictMode: true,
  ...(staticExport
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
