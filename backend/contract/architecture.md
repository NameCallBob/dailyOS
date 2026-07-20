# DailyOS — 架構契約（Architecture Contract / Integration Guide）

> 本文件是所有 subagent 的唯一真實來源（Single Source of Truth）。
> 主 Agent（Opus）負責維護；所有實作 Agent 必須嚴格遵守，禁止自建不相容架構。

## 0. 產品模式：試用 / 登入 雙版本同時建置

| 模式 | Cookie `daios_mode` | 資料來源 | 說明 |
| --- | --- | --- | --- |
| 試用 Trial | `"trial"` | 瀏覽器內 Dexie(IndexedDB) + seed 資料 | 完全前端處理，不需後端。首次讀取某資料表若為空則 lazy-seed。 |
| 登入 Auth | `"auth"` | REST API（`NEXT_PUBLIC_API_BASE`）+ token cookie `daios_token` | 同一套 UI，改由 HTTP 打後端。後端稍後依本契約實作。 |

- UI 與元件程式碼**完全相同**，只有 `resource.ts` 內的 transport 依模式切換。
- Cookie 保存模式，確保重新整理後每個步驟狀態可被測試。

## 1. 技術棧（固定）

Next.js（App Router）· TypeScript **strict** · Tailwind CSS · @tanstack/react-query · zustand · zod · react-hook-form · dexie · dexie-react-hooks。套件管理：npm。禁止大量 `any`。

## 2. 目錄結構（固定）

```
frontend/
  package.json  tsconfig.json  next.config.mjs  tailwind.config.ts  postcss.config.mjs
  src/
    middleware.ts                         # 依 daios_mode / daios_token 導流
    app/
      layout.tsx  globals.css
      (marketing)/page.tsx                # 落地頁：選「試用」或「登入」
      (marketing)/login/page.tsx          # 登入表單（auth 模式）
      (app)/layout.tsx                     # App Shell：桌面側欄 / 手機底部導覽 / 頂部 Quick Add + 模式徽章
      (app)/dashboard/page.tsx  ...        # 每個模組一頁（見命名表）
    lib/
      mode.ts        # getMode()/setMode()/isTrial()/isAuth()（cookie 讀寫）
      db.ts          # Dexie DB「DaiOSDB」，宣告所有資料表（version 1）
      http.ts        # fetch client；base=NEXT_PUBLIC_API_BASE；bearer=daios_token；snake_case⇄camelCase；標準錯誤
      resource.ts    # createResource<T>()：依模式回傳 Dexie 或 HTTP 實作 + react-query hooks + lazy seed
      types.ts       # BaseRecord 等共用型別
      nav.ts         # 導覽註冊表（所有模組，繁中 label、icon、path、group）
      query.ts       # QueryClient provider
    components/ui/   # 設計系統原子元件（Button/Input/Card/Sheet/Dialog/EmptyState/ErrorState/Spinner/StatTile/Toast…）
    features/<module>/   # 各模組自有元件、schema、seed、業務邏輯
```

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

- 試用：Dexie 資料表名 = `name`；lazy seed（表空時插入 `seed()`）。
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
