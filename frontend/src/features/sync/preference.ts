/**
 * features/sync/preference.ts — 使用者是否開啟同步的偏好設定。
 *
 * 只是「使用者是否想要同步」的意願旗標，與 lib/mode.ts 的 daios_mode/daios_token
 * 無關（那是「能不能」；這裡是「要不要」）。存在 localStorage，因為：
 * - 不是可同步資源，不該進 Dexie 的 `sync_mutations` 觀察範圍。
 * - 需要在頁面重整後立即同步讀取（localStorage 為同步 API，cookie 亦可但語意上
 *   這是純前端 UI 偏好，不需要伺服器或 middleware 讀取）。
 */

const SYNC_ENABLED_KEY = "daios_sync_enabled";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getSyncEnabled(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(SYNC_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSyncEnabled(enabled: boolean): void {
  if (!isBrowser()) return;
  try {
    if (enabled) {
      window.localStorage.setItem(SYNC_ENABLED_KEY, "1");
    } else {
      window.localStorage.removeItem(SYNC_ENABLED_KEY);
    }
  } catch {
    // localStorage 不可用（隱私模式等）：靜默忽略，同步保持關閉。
  }
}
