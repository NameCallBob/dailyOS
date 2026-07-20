/**
 * features/data-transfer/import.ts — 解析、驗證並套用備份 JSON 檔到目前模式的 Dexie。
 *
 * 流程：讀檔 → JSON.parse → zod 結構驗證 → schemaVersion 檢查 → 產生各表筆數摘要（供 UI 確認）
 * → 使用者選擇策略後才實際寫入：
 * - merge   依 id 比對，匯入資料的 updatedAt 較新（或本地不存在）才覆蓋。
 * - replace 先清空該表再整批寫入匯入資料。
 */

import { DB_TABLE_NAMES, getDb } from "@/lib/db";
import { backupFileSchema, KNOWN_TABLE_NAMES, SCHEMA_VERSION } from "./schema";
import type { BackupFile, BackupRow, ImportResult, ImportStrategy, ParsedBackup, TableSummaryRow } from "./types";

/** 使用者可讀的匯入/解析錯誤（非預期例外一律轉換為此類別）。 */
export class BackupParseError extends Error {}

/** 讀取檔案內容並 JSON.parse；失敗時丟出 BackupParseError。 */
export async function readBackupFile(file: File): Promise<unknown> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new BackupParseError("無法讀取檔案內容，請確認檔案未損壞。");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BackupParseError("檔案不是有效的 JSON 格式。");
  }
}

/** 驗證備份檔結構與版本，並產生匯入前摘要（各表筆數、未知表格）。 */
export function parseBackupBundle(raw: unknown): ParsedBackup {
  const parsed = backupFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BackupParseError("備份檔格式不正確，無法辨識內容結構。");
  }
  const bundle = parsed.data as BackupFile;
  if (bundle.schemaVersion !== SCHEMA_VERSION) {
    throw new BackupParseError(
      `不支援的備份版本（檔案為 v${bundle.schemaVersion}，目前支援 v${SCHEMA_VERSION}），請使用最新版本重新匯出。`,
    );
  }

  const summary: TableSummaryRow[] = DB_TABLE_NAMES.map((table) => ({
    table,
    count: bundle.tables[table]?.length ?? 0,
  }));
  const totalRows = summary.reduce((sum, row) => sum + row.count, 0);
  const unknownTables = Object.keys(bundle.tables).filter((key) => !KNOWN_TABLE_NAMES.has(key));

  return { bundle, summary, totalRows, unknownTables };
}

/** 讀檔 + 驗證的組合便利函式，供 UI 一次呼叫。 */
export async function parseBackupFile(file: File): Promise<ParsedBackup> {
  const raw = await readBackupFile(file);
  return parseBackupBundle(raw);
}

function rowUpdatedAt(row: BackupRow): string {
  const value = row.updatedAt;
  return typeof value === "string" ? value : "";
}

/**
 * 實際套用匯入。全表在單一交易中處理，任一表失敗即整批回滾，避免資料半套用。
 */
export async function applyImport(bundle: BackupFile, strategy: ImportStrategy): Promise<ImportResult> {
  const db = getDb();
  let rowsWritten = 0;
  let tablesWritten = 0;

  await db.transaction("rw", DB_TABLE_NAMES, async () => {
    for (const name of DB_TABLE_NAMES) {
      const table = db.table<BackupRow, string>(name);
      const incomingRows = bundle.tables[name] ?? [];

      if (strategy === "replace") {
        await table.clear();
        if (incomingRows.length > 0) {
          await table.bulkPut(incomingRows);
          rowsWritten += incomingRows.length;
          tablesWritten += 1;
        }
        continue;
      }

      if (incomingRows.length === 0) continue;
      let wroteAny = false;
      for (const row of incomingRows) {
        const id = row.id;
        if (typeof id !== "string" || id.length === 0) continue;
        const existing = await table.get(id);
        if (!existing || rowUpdatedAt(row) >= rowUpdatedAt(existing)) {
          await table.put(row);
          rowsWritten += 1;
          wroteAny = true;
        }
      }
      if (wroteAny) tablesWritten += 1;
    }
  });

  return { strategy, tablesWritten, rowsWritten };
}
