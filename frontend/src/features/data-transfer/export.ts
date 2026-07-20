/**
 * features/data-transfer/export.ts — 讀取目前模式的 Dexie 全部資料表，
 * 組成備份 JSON 並觸發瀏覽器下載。純前端運作，供本機模式跨電腦攜帶資料。
 */

import { DB_TABLE_NAMES, getDb } from "@/lib/db";
import { getMode } from "@/lib/mode";
import { SCHEMA_VERSION } from "./schema";
import type { BackupFile } from "./types";

/** 讀取目前模式 Dexie 全部 34 張表，組成備份物件（不觸發下載）。 */
export async function buildBackupBundle(): Promise<BackupFile> {
  const db = getDb();
  const tables: BackupFile["tables"] = {};
  for (const name of DB_TABLE_NAMES) {
    tables[name] = await db.table<Record<string, unknown>, string>(name).toArray();
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    mode: getMode() ?? "local",
    tables,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 檔名如 dailyos-backup-YYYYMMDD.json（本地時間）。 */
export function backupFileName(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `dailyos-backup-${y}${m}${d}.json`;
}

/** 觸發瀏覽器下載（僅限瀏覽器環境）。 */
export function downloadBackupFile(bundle: BackupFile): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = backupFileName();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** 讀取全部資料並觸發下載；回傳備份內容供呼叫端顯示摘要（例如筆數）。 */
export async function exportBackup(): Promise<BackupFile> {
  const bundle = await buildBackupBundle();
  downloadBackupFile(bundle);
  return bundle;
}
