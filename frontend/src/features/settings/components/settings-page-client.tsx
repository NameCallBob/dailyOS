"use client";

import { useEffect, useState } from "react";

import { getMode, type DaiosMode } from "@/lib/mode";

import { SettingsPage } from "./settings-page";

/** 客戶端讀取目前模式後渲染設定頁（靜態匯出無法在伺服器端讀 cookie）。 */
export function SettingsPageClient() {
  const [mode, setMode] = useState<DaiosMode>("trial");

  useEffect(() => {
    setMode(getMode() ?? "trial");
  }, []);

  return <SettingsPage mode={mode} />;
}
