/**
 * features/settings/mode-actions.ts — 「模式切換」與「重置示範資料」動作。
 *
 * 重置示範資料只在試用模式下提供：清空本機 Dexie 後，強制整頁重新載入
 * （而非 SPA 導頁），因為 lib/resource.ts 內以模組級變數 `seededTables` 追蹤
 * 「哪些表已 lazy-seed 過」；只有整頁重新載入才能讓該追蹤狀態歸零，
 * 使下一次讀取重新觸發 seed()。此檔案不修改 lib/resource.ts，僅利用其
 * 既有的 lazy-seed 行為。
 */

import { DB_TABLE_NAMES, getDb } from "@/lib/db";
import { clearMode, clearToken, isTrial, setMode } from "@/lib/mode";

/** 清空本機所有 Dexie 資料表，並整頁重新導向 /dashboard 以觸發重新 seed。 */
export async function resetTrialSeedData(): Promise<void> {
  if (!isTrial()) return;
  const db = getDb();
  await db.transaction("rw", DB_TABLE_NAMES.map((name) => db.table(name)), async () => {
    for (const name of DB_TABLE_NAMES) {
      await db.table(name).clear();
    }
  });
  window.location.assign("/dashboard");
}

/** 由登入模式切換回試用模式：清除 token，切換 cookie，整頁重新導向 dashboard。 */
export function switchToTrialMode(): void {
  clearToken();
  setMode("trial");
  window.location.assign("/dashboard");
}

/** 由試用模式切換到登入模式：清除目前模式 cookie 後導向登入頁（該頁在未偵測到模式時才會顯示表單）。 */
export function switchToAuthMode(): void {
  clearMode();
  window.location.assign("/login");
}
