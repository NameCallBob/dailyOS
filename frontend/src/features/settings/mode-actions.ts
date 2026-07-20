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

/**
 * 模式切換一律是整頁導頁（window.location.assign），SPA 的 toast 狀態不會存活。
 * 用 sessionStorage 暫存一則「切換後」提示訊息，由 App Shell 掛載時讀取並顯示一次。
 */
const MODE_SWITCH_NOTICE_KEY = "daios_mode_switch_notice";

function setPendingModeSwitchNotice(message: string): void {
  try {
    sessionStorage.setItem(MODE_SWITCH_NOTICE_KEY, message);
  } catch {
    // sessionStorage 不可用（例如隱私模式）：靜默略過，不影響模式切換本身。
  }
}

/** 讀取並清除待顯示的模式切換提示；供 App Shell 掛載時呼叫一次。 */
export function consumePendingModeSwitchNotice(): string | undefined {
  try {
    const message = sessionStorage.getItem(MODE_SWITCH_NOTICE_KEY);
    if (message) sessionStorage.removeItem(MODE_SWITCH_NOTICE_KEY);
    return message ?? undefined;
  } catch {
    return undefined;
  }
}

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

/** 切換回試用模式：清除 token，切換 cookie，整頁重新導向 dashboard。 */
export function switchToTrialMode(): void {
  clearToken();
  setMode("trial");
  setPendingModeSwitchNotice("已切換為試用模式，目前顯示的是可隨時重置的示範資料。");
  window.location.assign("/dashboard");
}

/**
 * 切換為本機模式：清除 token（本機模式未登入時不使用同步），切換 cookie，
 * 整頁重新導向 dashboard。本機模式使用獨立的 Dexie 資料庫（DaiOSDB，非 trial 的
 * demo 庫），起始為空、不會載入 seed 資料。
 */
export function switchToLocalMode(): void {
  clearToken();
  setMode("local");
  setPendingModeSwitchNotice(
    "已切換為本機模式，資料只保存在這台裝置的瀏覽器中。可在「設定 → 資料、提醒與同步」安裝為 App、開啟本機提醒，或於登入後開啟雲端同步。",
  );
  window.location.assign("/dashboard");
}

/** 切換到登入模式：清除目前模式 cookie 後導向登入頁（該頁在未偵測到模式時才會顯示表單）。 */
export function switchToAuthMode(): void {
  clearMode();
  window.location.assign("/login");
}
