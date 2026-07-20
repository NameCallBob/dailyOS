"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getMode, getToken, type DaiosMode } from "@/lib/mode";

/**
 * 客戶端路由守衛 —— 取代靜態匯出無法使用的 middleware。
 *
 * 規則（與原 middleware 相同）：
 * - 沒有有效 daios_mode → 導回落地頁 "/"。
 * - mode === "auth" 但缺 daios_token → 導向 "/login"。
 * - 其餘（trial / local / auth+token）→ 以該模式渲染子內容。
 *
 * 解析前不渲染任何 App 內容，避免未授權畫面閃現。
 */
export function RouteGuard({ children }: { children: (mode: DaiosMode) => React.ReactNode }) {
  const router = useRouter();
  const [mode, setMode] = useState<DaiosMode | null>(null);

  useEffect(() => {
    const current = getMode();
    if (!current) {
      router.replace("/");
      return;
    }
    if (current === "auth" && !getToken()) {
      router.replace("/login");
      return;
    }
    setMode(current);
  }, [router]);

  if (!mode) return null;
  return <>{children(mode)}</>;
}
