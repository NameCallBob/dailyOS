import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toast";

import "./globals.css";

// metadata.icons 不會自動套用 basePath（僅 manifest 會），故手動前綴，
// 讓 GitHub Pages 子路徑（/dailyOS）與本機（"")皆正確。
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: {
    default: "DailyOS",
    template: "%s · DailyOS",
  },
  description: "DailyOS — 個人任務、健康與生活的整合式管理平台。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DailyOS",
  },
  icons: {
    icon: `${BASE}/icons/icon.svg`,
    apple: `${BASE}/icons/icon-192.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
