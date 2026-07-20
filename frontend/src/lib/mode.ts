/**
 * lib/mode.ts
 * 讀寫 `daios_mode` cookie，供 resource.ts / middleware.ts / App Shell 徽章共用。
 *
 * 三種模式：
 * - "trial" 試用：Dexie（demo 資料庫 DaiOSDB_trial），假 seed，可隨時重置。用於評估。
 * - "local" 本機：Dexie（真實資料庫 DaiOSDB），你的真實資料，不自動 seed；可安裝為 PWA、
 *   本機提醒、JSON 匯出/匯入跨電腦；登入後可選擇開啟雲端同步。
 * - "auth"  雲端：資料透過 REST API 存於後端，跨裝置即時同步。
 *
 * 資料層規則：auth → HTTP；trial / local → Dexie（見 usesDexie/isLocalData）。
 */

export type DaiosMode = "trial" | "local" | "auth";

const VALID_MODES: readonly DaiosMode[] = ["trial", "local", "auth"];

function isValidMode(value: string | undefined): value is DaiosMode {
  return value === "trial" || value === "local" || value === "auth";
}

export const MODE_COOKIE = "daios_mode";
export const TOKEN_COOKIE = "daios_token";

const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isBrowser(): boolean {
  return typeof document !== "undefined";
}

/** 從任意 cookie 字串（document.cookie 或 middleware 的 header）取值 */
export function readCookie(cookieHeader: string, name: string): string | undefined {
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rawVal] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawVal.join("="));
    }
  }
  return undefined;
}

function writeCookie(name: string, value: string, maxAge = DEFAULT_COOKIE_MAX_AGE): void {
  if (!isBrowser()) return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string): void {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** 取得目前模式（僅限瀏覽器端；伺服器端請使用 readCookie(header, MODE_COOKIE)） */
export function getMode(): DaiosMode | undefined {
  if (!isBrowser()) return undefined;
  const value = readCookie(document.cookie, MODE_COOKIE);
  return isValidMode(value) ? value : undefined;
}

export function setMode(mode: DaiosMode): void {
  writeCookie(MODE_COOKIE, mode);
}

export function clearMode(): void {
  deleteCookie(MODE_COOKIE);
}

export function isTrial(): boolean {
  return getMode() === "trial";
}

export function isLocal(): boolean {
  return getMode() === "local";
}

export function isAuth(): boolean {
  return getMode() === "auth";
}

/** 是否為「以 Dexie 為主要資料來源」的模式（trial 或 local）。 */
export function isLocalData(): boolean {
  const mode = getMode();
  return mode === "trial" || mode === "local";
}

/** 資料層是否走 Dexie（等同 isLocalData；語意化別名）。 */
export function usesDexie(): boolean {
  return isLocalData();
}

/** 所有合法模式清單（供設定頁模式切換 UI 使用）。 */
export function allModes(): readonly DaiosMode[] {
  return VALID_MODES;
}

export function getToken(): string | undefined {
  if (!isBrowser()) return undefined;
  return readCookie(document.cookie, TOKEN_COOKIE);
}

export function setToken(token: string): void {
  writeCookie(TOKEN_COOKIE, token);
}

export function clearToken(): void {
  deleteCookie(TOKEN_COOKIE);
}

/** 登出：清除模式與 token，回到落地頁 */
export function resetSession(): void {
  clearMode();
  clearToken();
}
