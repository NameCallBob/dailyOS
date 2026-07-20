/**
 * features/data-transfer/types.ts — 匯出/匯入備份檔的共用型別。
 *
 * 備份檔為單一 JSON，包含 34 張 Dexie 資料表的完整內容，
 * 用於「本機模式」跨裝置攜帶資料（純前端運作，不依賴後端）。
 */

import type { DbTableName } from "@/lib/db";
import type { DaiosMode } from "@/lib/mode";

/** 單一資料列：所有表格都以 Record<string, unknown> 儲存（與 lib/db.ts 一致）。 */
export type BackupRow = Record<string, unknown>;

/** 備份檔案結構。tables 的 key 理論上等於 DbTableName，但驗證前先以 string 寬鬆表示。 */
export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  mode: DaiosMode;
  tables: Record<string, BackupRow[]>;
}

/** 匯入策略：merge = 依 id 以較新 updatedAt 覆蓋；replace = 先清空再匯入。 */
export type ImportStrategy = "merge" | "replace";

/** 匯入前預覽用的各表筆數摘要。 */
export interface TableSummaryRow {
  table: DbTableName;
  count: number;
}

/** 已解析並通過結構驗證的備份檔，附上摘要資訊供 UI 顯示。 */
export interface ParsedBackup {
  bundle: BackupFile;
  summary: TableSummaryRow[];
  totalRows: number;
  /** 備份檔內含、但目前版本 schema 不認得的表格名稱（例如舊/新版本落差）。 */
  unknownTables: string[];
}

/** 匯入執行結果，供完成畫面顯示。 */
export interface ImportResult {
  strategy: ImportStrategy;
  tablesWritten: number;
  rowsWritten: number;
}
