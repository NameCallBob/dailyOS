import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toast";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DailyOS",
    template: "%s · DailyOS",
  },
  description: "DailyOS — 個人任務、健康與生活的整合式管理平台。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DailyOS",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-192.png",
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
