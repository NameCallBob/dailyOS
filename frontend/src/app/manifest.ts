import type { MetadataRoute } from "next";

// 動態產生 manifest，使 start_url / scope / icons 依 basePath 對齊
// （GitHub Pages 專案站台服務於 /dailyOS/，本機為根路徑）。
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DailyOS",
    short_name: "DailyOS",
    description: "個人任務、健康與生活的整合式管理平台。",
    start_url: `${BASE}/dashboard/`,
    scope: `${BASE}/`,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "zh-Hant",
    dir: "ltr",
    icons: [
      { src: `${BASE}/icons/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: `${BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BASE}/icons/icon-maskable-192.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `${BASE}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
