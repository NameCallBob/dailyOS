/**
 * features/settings/export.ts — 健康資料預設僅本人可見；此處提供「匯出」與「完整刪除」。
 *
 * 匯出：
 * - 試用模式：直接讀取瀏覽器內 Dexie 所有資料表（未刪除的紀錄），組成 JSON 後在前端觸發下載。
 * - 登入模式：呼叫帳號層級匯出端點 `GET /api/v1/export/`（回傳完整帳號資料），一樣觸發下載。
 *
 * 完整刪除：
 * - 試用模式：清空本機 Dexie 所有資料表（僅影響此瀏覽器，不可復原）。
 * - 登入模式：呼叫 `POST /api/v1/account/purge/`（伺服器端刪除該帳號所有資料，不可復原）。
 *
 * 這兩個端點不屬於單一資源的 CRUD，因此不透過 createResource 的 actions，而是帳號層級
 * 的獨立端點；由本檔案直接使用 lib/http.ts 的通用 http client 呼叫。
 */

import { http } from "@/lib/http";
import { DB_TABLE_NAMES, getDb } from "@/lib/db";
import { isAuth } from "@/lib/mode";

export const EXPORT_ENDPOINT = "/api/v1/export/";
export const PURGE_ENDPOINT = "/api/v1/account/purge/";

async function collectTrialExportBundle(): Promise<Record<string, unknown[]>> {
  const db = getDb();
  const bundle: Record<string, unknown[]> = {};
  for (const name of DB_TABLE_NAMES) {
    const rows = await db.table(name).toArray();
    bundle[name] = rows.filter((row) => !(row as { deleted?: boolean }).deleted);
  }
  return bundle;
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** 匯出目前帳號 / 裝置的完整資料為 JSON 檔並觸發下載。 */
export async function exportAllData(): Promise<void> {
  const bundle = isAuth() ? await http.get<Record<string, unknown[]>>(EXPORT_ENDPOINT) : await collectTrialExportBundle();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(`dailyos-export-${stamp}.json`, bundle);
}

/** 永久刪除所有資料（不可復原）。試用模式清空本機 Dexie；登入模式呼叫伺服器端刪除。 */
export async function purgeAllData(): Promise<void> {
  if (isAuth()) {
    await http.post<void>(PURGE_ENDPOINT);
    return;
  }
  const db = getDb();
  await db.transaction("rw", DB_TABLE_NAMES.map((name) => db.table(name)), async () => {
    for (const name of DB_TABLE_NAMES) {
      await db.table(name).clear();
    }
  });
}
