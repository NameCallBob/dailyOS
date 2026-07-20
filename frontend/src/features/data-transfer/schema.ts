/**
 * features/data-transfer/schema.ts — 備份檔的 zod 結構驗證。
 *
 * 只驗證「信封」結構（schemaVersion / exportedAt / mode / tables）與每筆資料
 * 至少要有 `id` 字串欄位；不對 34 張表各自的欄位做嚴格 schema 驗證 ——
 * 這些欄位規則屬於各模組（lib/db.ts 對應的 createResource schema），
 * 匯入時交由 Dexie put 直接寫入，欄位缺漏由使用者自行承擔（合併/取代前皆有預覽與確認）。
 */

import { z } from "zod";

import { DB_TABLE_NAMES } from "@/lib/db";

/** 目前支援匯入的備份格式版本；未來欄位有破壞性變更時於此遞增。 */
export const SCHEMA_VERSION = 1;

/** 目前已知的資料表名稱集合，用於標記備份檔中無法辨識的表格。 */
export const KNOWN_TABLE_NAMES = new Set<string>(DB_TABLE_NAMES);

const backupRowSchema = z
  .record(z.string(), z.unknown())
  .refine((row) => typeof row.id === "string" && row.id.length > 0, {
    message: "每筆資料須包含非空的 id 欄位。",
  });

export const backupFileSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string().min(1),
  mode: z.enum(["trial", "local", "auth"]),
  tables: z.record(z.string(), z.array(backupRowSchema)),
});

export type BackupFileInput = z.infer<typeof backupFileSchema>;
