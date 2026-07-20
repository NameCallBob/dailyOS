"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getMode, getToken } from "@/lib/mode";

/**
 * 行銷頁（落地頁 / 登入頁）的客戶端重導守衛，取代原本 middleware + 伺服器端 cookie 判斷。
 *
 * - context="landing"：已選任一有效模式 → 導向 /dashboard。
 * - context="login"  ：trial / local，或 auth 且有 token → 導向 /dashboard。
 *
 * 本身不渲染任何內容；掛在靜態頁面上，於瀏覽器掛載後才判斷。
 */
export function AutoRedirect({ context }: { context: "landing" | "login" }) {
  const router = useRouter();

  useEffect(() => {
    const mode = getMode();
    if (context === "landing") {
      if (mode === "trial" || mode === "local" || mode === "auth") {
        router.replace("/dashboard");
      }
      return;
    }
    // login
    if (mode === "trial" || mode === "local" || (mode === "auth" && getToken())) {
      router.replace("/dashboard");
    }
  }, [context, router]);

  return null;
}
