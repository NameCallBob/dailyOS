/**
 * features/sync/index.ts — 同步引擎對外入口。
 *
 * - `initSync()`：App Shell 掛載一次（例如 `useEffect(() => initSync(), [])`），
 *   僅在本機（local）模式生效，其餘模式為 no-op；回傳 cleanup 函式。
 * - `<SyncSection />`：設定頁可直接掛載的完整同步設定區塊（開關、狀態、衝突清單、
 *   手動同步鈕），自行處理 Loading / Error / Empty 與模式判斷。
 */

export { initSync, isSyncEligible, setSyncPreference, triggerSync } from "./engine";
export { SyncSection } from "./components/sync-section";
export type {
  SyncConflictRecord,
  SyncEngineStatus,
  SyncMutationRecord,
  SyncMutationStatus,
  SyncOp,
} from "./types";
