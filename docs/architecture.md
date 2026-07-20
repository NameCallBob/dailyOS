# DailyOS — 架構契約（Architecture Contract / Integration Guide）

> 本文件是所有 subagent 的唯一真實來源（Single Source of Truth）。
> 主 Agent（Opus）負責維護；所有實作 Agent 必須嚴格遵守，禁止自建不相容架構。

## 0. 產品模式：試用 / 本機 / 登入 三版本同時建置

| 模式 | Cookie `daios_mode` | 資料來源 | 說明 |
| --- | --- | --- | --- |
| 試用 Trial | `"trial"` | 瀏覽器內 Dexie（`DaiOSDB_trial`）+ seed 資料 | 完全前端處理，不需後端。首次讀取某資料表若為空則 lazy-seed。可隨時一鍵重置。 |
| 本機 Local | `"local"` | 瀏覽器內 Dexie（`DaiOSDB`，與 trial 完全獨立、不共用） | 完全前端處理，不需後端。使用者真實資料，起始為空、**不** lazy-seed。可安裝 PWA、本機提醒、JSON 匯出/匯入；登入後可選擇開啟雲端同步。 |
| 登入 Auth | `"auth"` | REST API（`NEXT_PUBLIC_API_BASE`）+ token cookie `daios_token` | 同一套 UI，改由 HTTP 打後端。後端稍後依本契約實作。 |

- UI 與元件程式碼**完全相同**，只有 `resource.ts` 內的 transport 依模式切換：`isAuth()` 為真才走 HTTP，否則一律走 Dexie（trial 與 local 共用同一套 Dexie transport，差別只在 `isTrial()` 決定是否 lazy-seed，以及 `dbNameForMode()` 決定連到哪一個 IndexedDB）。
- Cookie 保存模式，確保重新整理後每個步驟狀態可被測試；三種模式的合法值清單由 `lib/mode.ts` 的 `allModes()` 提供，供設定頁的模式切換 UI 使用，不得寫死陣列。
- 模式切換一律整頁重新導向（`window.location.assign`），因為 `resource.ts` 的 `seededTables` 是模組級變數，只有整頁重新載入才能重置「哪些表已 lazy-seed」的追蹤狀態。
- **本機提醒（`features/reminders`）與雲端同步（`features/sync`）的誠實邊界**：純本機（trial / local）模式下，「App 完全關閉」時只有 Chromium 系（Chrome / Edge）透過 Notification Triggers 能可靠地預約通知，Safari 不支援；App 開啟中所有主流瀏覽器皆可靠。雲端同步僅在 local 模式 + 已登入（有 `daios_token`）時才會啟動，trial 與 auth 皆為 no-op（auth 模式資料本來就即時在伺服器上，不需要「另外同步」）。UI 文案必須直接反映執行期偵測到的能力，不得宣稱未偵測到的能力。

## 1. 技術棧（固定）

Next.js（App Router）· TypeScript **strict** · Tailwind CSS · @tanstack/react-query · zustand · zod · react-hook-form · dexie · dexie-react-hooks。套件管理：npm。禁止大量 `any`。

## 2. 目錄結構（固定）

```
frontend/
  package.json  tsconfig.json  next.config.mjs  tailwind.config.ts  postcss.config.mjs
  src/
    middleware.ts                         # 依 daios_mode / daios_token 導流（trial/local 免 token，auth 需 token）
    app/
      layout.tsx  globals.css
      (marketing)/page.tsx                # 落地頁：選「試用」／「本機」／「登入」
      (marketing)/login/page.tsx          # 登入表單（auth 模式；本機模式登入開同步也共用此頁，見下方「登入行為」）
      (app)/layout.tsx                     # App Shell：桌面側欄 / 手機底部導覽 / 頂部 Quick Add + 模式徽章
                                            #  掛載時呼叫 initReminders() / initSync()（各自依模式自我判斷）
      (app)/dashboard/page.tsx  ...        # 每個模組一頁（見命名表）
      (app)/settings/page.tsx             # 設定頁：個人資料／通知偏好／隱私與資料／資料、提醒與同步／模式 五個分頁
    lib/
      mode.ts        # DaiosMode="trial"|"local"|"auth"；getMode()/setMode()/clearMode()/isTrial()/isLocal()/isAuth()/
                      #  isLocalData()/usesDexie()/allModes()/getToken()/setToken()/clearToken()（cookie 讀寫）
      db.ts          # Dexie：DB_NAME_TRIAL（DaiOSDB_trial）與 DB_NAME_LOCAL（DaiOSDB）兩個獨立資料庫，
                      #  34 張資料表（version 1）；getDb() 依 dbNameForMode() 選擇
      http.ts        # fetch client；base=NEXT_PUBLIC_API_BASE；bearer=daios_token；snake_case⇄camelCase；標準錯誤
      resource.ts    # createResource<T>()：依模式回傳 Dexie 或 HTTP 實作 + react-query hooks + lazy seed（僅 trial）
                      #  + registerLocalWriteObserver()（每次本地寫入通知訂閱者，供 reminders/sync 使用）
      types.ts       # BaseRecord 等共用型別
      nav.ts         # 導覽註冊表（所有模組，繁中 label、icon、path、group）
      query.ts       # QueryClient provider
    components/ui/   # 設計系統原子元件（Button/Input/Card/Sheet/Dialog/EmptyState/ErrorState/Spinner/StatTile/Toast…）
    components/pwa/  # Service Worker 註冊（sw.js，importScripts 掛載 reminders-sw.js）、
                      #  beforeinstallprompt 安裝提示（InstallButton / useInstallPrompt）
    features/<module>/   # 各模組自有元件、schema、seed、業務邏輯
    features/data-transfer/  # 本機模式 JSON 匯出/匯入（<DataTransferSection/>，讀寫 34 張表）
    features/reminders/      # 本機提醒排程器（initReminders()、<RemindersSection/>、detectReminderCapabilities()）
    features/sync/            # 本機模式登入後的雲端同步引擎（initSync()、<SyncSection/>，自有 Dexie 佇列 DaiOSDB_sync）
```

### 登入行為（`(marketing)/login/login-form.tsx`）

登入成功後是否切換 `daios_mode` 為 `"auth"`，取決於登入前的模式：

- 若登入前 `getMode() === "local"`（使用者是從本機模式的「設定 → 資料、提醒與同步 → 前往登入」進來，目的是開啟雲端同步）：只 `setToken()`，**不**呼叫 `setMode("auth")`，維持本機模式，資料仍走 Dexie；`features/sync` 偵測到 `isLocal() && getToken()` 後即具備開啟同步的資格。
- 其餘情況（登入前無模式或為 `"trial"`，即從落地頁「登入 / 註冊」進來）：`setToken()` 之後呼叫 `setMode("auth")`，完整切換為雲端模式。

這個分支是必要的：若無條件把登入後的模式設為 `"auth"`，本機模式使用者一登入就會被切到 HTTP transport，看不到自己 Dexie 裡的真實資料。

## 3. Repo 契約（`createResource`）＝ API 契約

```ts
interface BaseRecord { id: string; createdAt: string; updatedAt: string; version: number; deleted: boolean; }

interface Repo<T extends BaseRecord> {
  list(params?: ListParams): Promise<Page<T>>;
  get(id: string): Promise<T>;
  create(input: Partial<T>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
  // react-query hooks
  useList(params?: ListParams): UseQueryResult<Page<T>>;
  useItem(id: string): UseQueryResult<T>;
}
createResource<T>({ name, schema /*zod*/, seed /*() => T[]*/, actions? })
```

- 試用 / 本機：Dexie 資料表名 = `name`；僅試用模式 lazy seed（表空時插入 `seed()`），本機模式起始永遠為空。
- 登入：對應 REST 端點 `/api/v1/{name}/`。

### 對應後端 API（稍後精準實作，避免串接問題）

每個資源 `name`：
```
GET    /api/v1/{name}/?<filters>&search=&ordering=&page=   -> { results, count, next, previous }
POST   /api/v1/{name}/                                      -> 201 record
GET    /api/v1/{name}/{id}/                                 -> record
PATCH  /api/v1/{name}/{id}/                                 -> record
DELETE /api/v1/{name}/{id}/                                 -> 204
```
- Auth：`POST /api/v1/auth/login/ {email,password} -> {token,user}`、`/auth/register/`、`/auth/logout/`。
- 每筆記錄含 `id(uuid)`, `created_at`, `updated_at`, `version(int)`, `deleted(bool)`；http.ts 負責 snake_case⇄camelCase。
- 錯誤格式：`{ code, message, field_errors, request_id }`；不得直接回傳 internal exception。
- 自訂 action（各模組定義）例：`POST /api/v1/tasks/{id}/complete/`、`POST /api/v1/timers/{id}/stop/`。

## 4. 設計系統（繁中介面、雜誌編排）

白底黑字 + 灰階 + 單一低彩度 accent；大量留白、細線分隔、雜誌式標題、數據用 tabular-nums。狀態不可僅靠顏色；符合 WCAG 2.2 AA 對比；支援 `prefers-reduced-motion`。每個清單/資料視圖都必須實作 **Loading / Error / Empty / Offline** 四種狀態。介面文字一律繁體中文，程式碼識別字英文。

## 5. 狀態與表單規範

資料存取一律透過 repo 的 react-query hooks；本地 UI 狀態用 zustand；表單用 react-hook-form + zod。所有 mutation 需 optimistic update + 失敗 toast；重要刪除提供 Undo/垃圾桶。

## 6. Agent 隔離規則（防止衝突）

- Foundation agent 產生第 2 節「共用」檔案 + 落地/登入/App Shell/nav/設計系統/PWA。
- 每個 Module agent **只能**建立：`src/app/(app)/<module>/**` 與 `src/features/<module>/**`。
- 禁止 module agent 修改共用檔案（db.ts、nav.ts、resource.ts、layout 等）；資料表已於 db.ts 預先宣告，nav 已預先列出所有模組。
- 禁止 module agent 執行 `npm install/build`（Foundation 已安裝；建置於整合階段統一執行）。
