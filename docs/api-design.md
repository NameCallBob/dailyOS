# DailyOS — API 設計契約（API Design Contract）

> 本文件由前端程式碼（`frontend/src/features/*`、`lib/resource.ts`、`lib/http.ts`）逆向整理而成，
> 是後端實作的**唯一依據**。目的：後端可依此逐一實作，不需與前端另行討論即可零落差串接。
>
> 對應文件：
> - OpenAPI 3.1 規格：`docs/openapi.yaml`
> - 離線／同步策略：`docs/offline-sync.md`
> - 整體架構契約：`docs/architecture.md`

---

## 0. 全域規則

### 0.1 Base URL 與認證

- Base URL：`process.env.NEXT_PUBLIC_API_BASE`（前端環境變數），所有資源路徑掛在其下的 `/api/v1/`。
- 認證：`Authorization: Bearer <token>`，token 來自 cookie `daios_token`（登入成功後由前端寫入）。
- 僅登入模式（cookie `daios_mode=auth`）才會呼叫 REST API；試用模式（`daios_mode=trial`）完全在瀏覽器 Dexie 中運作，後端不會收到任何請求。

### 0.2 命名慣例（大小寫轉換）

- 前端 TypeScript 一律使用 **camelCase**；後端 JSON **一律使用 snake_case**。
- `lib/http.ts` 於送出請求前將 body 由 camelCase 轉為 snake_case；收到回應後將 snake_case 轉回 camelCase（遞迴轉換，含陣列與巢狀物件）。
- **後端必須回傳 snake_case 欄位**，例如前端欄位 `dueDate` 對應 API 回應／請求中的 `due_date`；`projectId` 對應 `project_id`。本文件後續「請求/回應 JSON 形狀」一律以前端 camelCase 名稱列出欄位表，**實際 HTTP 傳輸請將每個欄位名轉為 snake_case**。

### 0.3 通用 CRUD 端點樣式

每個資源 `{name}`（見第 2 節清單）皆遵循以下五個標準端點：

```
GET    /api/v1/{name}/               列表（分頁 + 篩選 + 搜尋 + 排序）
POST   /api/v1/{name}/               建立
GET    /api/v1/{name}/{id}/          取得單筆
PATCH  /api/v1/{name}/{id}/          局部更新
DELETE /api/v1/{name}/{id}/          刪除（見 0.7 軟刪除語意）
```

不使用 `PUT`（全量取代）；前端一律送 `PATCH`。

### 0.4 List 查詢參數

`GET /api/v1/{name}/` 支援以下 query string 參數（對應 `lib/types.ts` 的 `ListParams` 與 `lib/http.ts` 的 `buildQueryString`）：

| 參數 | 型別 | 說明 |
| --- | --- | --- |
| `<field>` | string | 任意資源自身欄位的精確篩選（filter），例如 `?status=completed`、`?project_id=xxx`。欄位名已轉為 snake_case。前端目前僅送出精確等值篩選，不送範圍/模糊條件。 |
| `deleted` | `"true"` \| 省略 | 預設**不包含**已軟刪除的紀錄；帶 `deleted=true` 才會包含（供垃圾桶／還原 UI 使用）。 |
| `search` | string | 自由文字搜尋；後端可依資源決定搜尋欄位（例如任務標題、筆記內容），試用模式退化為對整筆記錄 JSON 字串化後的 `includes()` 比對，僅供近似行為參考，後端應提供更精準的全文檢索。 |
| `ordering` | string | 排序欄位；前綴 `-` 表示降冪，例如 `ordering=-updated_at`。 |
| `page` | number | 頁碼，從 1 開始。 |
| `page_size` | number | 每頁筆數；試用模式預設 50。 |

### 0.5 標準分頁回應（DRF 風格）

所有 `list` 端點回傳：

```json
{
  "results": [ /* 該頁資源陣列 */ ],
  "count": 123,
  "next": "http://.../api/v1/tasks/?page=2" ,
  "previous": null
}
```

- `next` / `previous`：無下一頁／上一頁時為 `null`。試用模式中這兩個欄位放的是頁碼字串（前端不解析其內容，只作為「是否存在」的判斷），後端可依 DRF 慣例回傳完整 URL。

### 0.6 標準錯誤格式

任何非 2xx 回應，body 必須是：

```json
{
  "code": "validation_error",
  "message": "資料格式不正確。",
  "field_errors": {
    "title": ["請輸入任務標題"]
  },
  "request_id": "req_abc123"
}
```

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `code` | 是 | 機器可讀錯誤碼，例如 `validation_error` / `not_found` / `unauthorized` / `network_error` / `http_500`。 |
| `message` | 是 | 人類可讀繁中訊息，直接顯示於 UI toast。 |
| `field_errors` | 否 | 逐欄位錯誤訊息陣列，鍵為 snake_case 欄位名；用於表單逐欄位顯示。 |
| `request_id` | 否 | 追蹤用 ID，供客服／除錯對照後端日誌。 |

**不得**直接回傳框架的 internal exception / stack trace。204 No Content 用於 `DELETE` 成功；其餘失敗一律走上述格式並搭配對應 HTTP status（400/401/403/404/409/422/500）。

前端 `ApiRequestError` 對應此格式；`fieldErrors` 會轉回 camelCase 供表單逐欄位顯示。

### 0.7 每筆記錄的共同欄位（BaseRecord）

所有資源記錄皆包含（回應時使用 snake_case）：

| 欄位（camelCase） | 型別 | 說明 |
| --- | --- | --- |
| `id` | string (uuid) | 主鍵，前端建立時可能已產生 uuid 並隨 `POST` 帶上；後端應接受該值作為主鍵（`upsert` 語意），若已存在同 id 則視為衝突（見 offline-sync.md）。 |
| `createdAt` | string (ISO 8601) | 建立時間。 |
| `updatedAt` | string (ISO 8601) | 最後更新時間；每次 `PATCH` 或 action 呼叫必須更新。 |
| `version` | number (int) | 樂觀鎖 / 同步版本號；每次成功寫入 `+1`，起始為 1。 |
| `deleted` | boolean | 軟刪除旗標。`DELETE /api/v1/{name}/{id}/` 語意為「將 `deleted` 設為 `true` 並 `version+1`、`updatedAt` 更新」，**不做實體刪除**（保留 tombstone 供離線同步 / Undo 使用）。回應 204 No Content。 |

> 詳細同步欄位語意（`version` 衝突解決、LWW／Server-wins 規則）見 `docs/offline-sync.md`。

### 0.8 自訂 Action 端點樣式

```
POST /api/v1/{name}/{id}/{action}/    -> 200 更新後的完整 record
```

- Body 依各 action 定義（可為空）。
- 回傳格式與 `PATCH` 相同：完整最新 record（含更新後的 `updatedAt` / `version`）。
- 所有自訂 action 見第 2 節各資源小節，總表見附錄 A。

### 0.9 樂觀更新與並發

前端所有 mutation 皆採樂觀更新（optimistic update），失敗時以錯誤 toast 呈現並復原畫面。後端不需支援任何特殊的「樂觀鎖 If-Match」標頭；`version` 欄位目前僅作同步/顯示用途，非強制的併發控制（試用模式的 `update()` 直接以伺服器/本地端最新值覆蓋 `merged` 後寫入）。若後端要導入嚴格併發控制，需另行與前端協調 409 回應與重試 UI（目前前端未實作）。

---

## 1. Auth 端點

不屬於任何資源 CRUD，獨立於 `/api/v1/auth/`：

| 方法 | 路徑 | Body | 200 回應 | 說明 |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register/` | `{ "email": string, "password": string }` | `{ "token": string, "user": { "id": string, "email": string } }` | 註冊新帳號。 |
| POST | `/api/v1/auth/login/` | `{ "email": string, "password": string }` | `{ "token": string, "user": { "id": string, "email": string } }` | 登入。成功後前端將 `token` 寫入 cookie `daios_token`，並把 `daios_mode` 設為 `"auth"`。 |
| POST | `/api/v1/auth/logout/` | 無 | 204 | 登出；前端同時清除 `daios_mode` / `daios_token` cookie 並導回落地頁。 |

錯誤（帳密錯誤、email 已註冊等）一律遵循 0.6 標準錯誤格式，`code` 建議使用 `invalid_credentials` / `email_taken` 等語意化值。

## 1.1 帳號層級端點（非資源 CRUD）

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/api/v1/export/` | 匯出目前登入帳號的完整資料（所有資源表、未刪除紀錄），回傳 JSON：`{ "<resource_name>": [...] }`，鍵為第 2 節所有資源名稱。前端觸發瀏覽器下載，檔名 `dailyos-export-YYYY-MM-DD.json`。 |
| POST | `/api/v1/account/purge/` | **不可復原**：永久刪除該帳號所有資料（非軟刪除，需真正清除）。回傳 204。用於「設定」頁「完整刪除我的資料」。 |

---

## 1.2 Sync 端點（本機模式登入後可選開啟同步）

> 對應前端程式碼：`frontend/src/features/sync/**`（僅該目錄可讀寫此功能，不影響既有 `lib/resource.ts` 的 trial/auth 兩種既有 transport）。
> 對應 OpenAPI：`docs/openapi.yaml` 的 `Sync*` schema 與 `/api/v1/sync/` 路徑。
> 衝突策略總覽見 `docs/offline-sync.md` §3；本節只定義「傳輸格式」。

**適用情境**：使用者處於「本機（local）模式」且已登入（`daios_token` 存在）、並在設定頁手動開啟「雲端同步」開關時，前端才會呼叫本節端點。試用模式與一般登入（auth）模式皆不使用此端點——試用模式資料本來就是本機 demo 不上傳；auth 模式資料本身已即時透過 0～2 節既有的資源 CRUD 端點直接存於伺服器，不需要再疊加一層佇列同步。

**認證**：與其餘端點相同，帶 `Authorization: Bearer <daios_token>`；未帶或無效回 401。

### 1.2.1 `POST /api/v1/sync/` — Push（上傳待同步佇列，批次）

前端把本機 Dexie 佇列（`sync_mutations` 表）中所有 `pending`／`failed` 狀態的項目一次性批次送出。

請求 body：

```json
{
  "mutations": [
    {
      "client_mutation_id": "b3f1c2e4-...",
      "resource": "notes",
      "op": "update",
      "record_id": "8f2a...",
      "payload": { "id": "8f2a...", "title": "...", "content": "...", "version": 4, "updated_at": "2026-07-20T03:11:00.000Z", "deleted": false },
      "client_updated_at": "2026-07-20T03:11:00.000Z"
    }
  ]
}
```

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `mutations[].client_mutation_id` | string (uuid) | **冪等鍵**。同一筆本地佇列項目重試多次時，此值固定不變；後端必須用它去重——若同一個 `client_mutation_id` 先前已被成功套用（`applied`），再次收到時**不得重複套用**，直接回傳當初的結果（同樣的 `status`／`record`）。建議後端以 `(user_id, client_mutation_id)` 建唯一索引作為去重依據。 |
| `mutations[].resource` | string | 資源名稱，值域同 `docs/api-design.md` 第 2 節資源總表（34 個資源之一）。 |
| `mutations[].op` | enum `create`\|`update`\|`remove` | 操作種類；`remove` 為軟刪除語意（同 0.7 節）。 |
| `mutations[].record_id` | string (uuid) | 該筆記錄的 `id`（前端產生的 client-generated id，見 0.7 節）。後端以此做 upsert，不自行改配 id。 |
| `mutations[].payload` | object \| null | `create`/`update` 帶完整記錄（camelCase 欄位已由前端轉為 snake_case，形狀同各資源 `PATCH` body）；`remove` 可能為 `null` 或帶刪除當下的完整快照（供後端比對版本）。 |
| `mutations[].client_updated_at` | string (ISO 8601) \| null | 前端裝置當下記錄的 `updated_at`；**僅供後端比對用**，時鐘偏差以第 1.2.3 節「伺服器時間為準」規則處理，後端不得直接信任此值做為最終 `updated_at`。 |

回應（`200`）：

```json
{
  "results": [
    {
      "client_mutation_id": "b3f1c2e4-...",
      "status": "applied",
      "record": { "id": "8f2a...", "version": 5, "updated_at": "2026-07-20T03:11:02.531Z", "...": "..." }
    },
    {
      "client_mutation_id": "c9a0...",
      "status": "conflict",
      "conflict": {
        "strategy": "manual_merge",
        "server_record": { "...": "..." },
        "server_version": 6,
        "server_updated_at": "2026-07-20T03:10:55.000Z"
      }
    },
    {
      "client_mutation_id": "d1b2...",
      "status": "rejected",
      "error": { "code": "validation_error", "message": "標題不可為空" }
    }
  ],
  "cursor": "2026-07-20T03:11:02.531Z:8f2a..."
}
```

| `results[].status` | 說明 |
| --- | --- |
| `applied` | 已成功套用，`record` 為套用後的最終完整記錄（含後端補齊的 `version`／`updated_at`）。前端會把此筆從本地佇列移除（視為已同步）。 |
| `conflict` | 依 §3.1/3.3 衝突策略判定為衝突：一般資源後端應直接以 **server-wins** 套用伺服器版本（此時可視同 `applied` 處理，`conflict.strategy` 回 `"server_wins"`，不需要前端額外介入）；`notes`／`note_versions` 等高價值長文字資源必須回 `conflict.strategy: "manual_merge"` 且**不得**覆蓋伺服器上的資料，前端會建立本地 `sync_conflicts` 記錄，保留兩版供使用者手動選擇。 |
| `rejected` | 驗證失敗或其他不可重試的錯誤（`error.code`／`error.message` 依 0.6 節標準錯誤格式的欄位語意）。前端標記該筆佇列項目為 `failed` 並停止自動重試該筆（避免用同一組必定失敗的資料無限重試），使用者可於 UI 手動查看錯誤訊息。 |

`results` 陣列順序不要求與請求 `mutations` 順序一致，前端以 `client_mutation_id` 做 map 比對。

### 1.2.2 `GET /api/v1/sync/?since={cursor}` — Pull（下載伺服器端變更）

| 參數 | 型別 | 說明 |
| --- | --- | --- |
| `since` | string，選填 | 上次 pull 拿到的 `cursor`；首次呼叫（本機從未同步過）省略此參數，後端應回傳「使用者帳號目前所有未刪除記錄」的完整快照當作首批變更（等同全量初始化）。 |

回應（`200`）：

```json
{
  "changes": [
    {
      "resource": "tasks",
      "op": "update",
      "record_id": "8f2a...",
      "record": { "id": "8f2a...", "title": "...", "version": 3, "updated_at": "2026-07-20T03:09:00.000Z", "...": "..." },
      "server_updated_at": "2026-07-20T03:09:00.000Z"
    },
    {
      "resource": "tasks",
      "op": "remove",
      "record_id": "3c11...",
      "server_updated_at": "2026-07-20T03:09:30.000Z"
    }
  ],
  "cursor": "2026-07-20T03:09:30.000Z:3c11...",
  "has_more": false
}
```

| 欄位 | 說明 |
| --- | --- |
| `changes[].op` | `create`／`update` 皆帶完整 `record`；`remove` 只需 `record_id`，`record` 可省略（前端只需要把本地對應記錄標記 `deleted=true`）。 |
| `changes[].server_updated_at` | 該筆變更在伺服器上的實際時間，**前端一律以此欄位做時間比較，不使用用戶端裝置時鐘**（見 1.2.3）。 |
| `cursor` | 不透明字串（opaque token），前端只會原樣回傳給下一次 `since`，不解析內容。建議實作為「時間戳 + 該時間戳內最後一筆記錄 id」的組合以應付同一毫秒多筆變更，避免漏抓或重複。 |
| `has_more` | 是否還有更多變更未包含在本次回應（後端可自行決定單頁筆數上限，建議 ≤500 筆）。若為 `true`，前端會用回應的 `cursor` 立即再拉一次，直到 `has_more=false` 或達到前端自訂的單次同步分頁上限（目前為 20 頁，防止串接錯誤時無限迴圈）。 |

### 1.2.3 冪等性、時鐘偏差與重試

- **`client_mutation_id` 冪等**：見 1.2.1；同一 id 重複送達（前端重試、或請求逾時後客戶端誤判失敗而重送）必須是安全的 no-op，回傳與首次相同的結果。
- **時鐘偏差以伺服器時間為準**：所有「誰比較新」的判斷（LWW／版本比對）一律使用後端產生的 `server_updated_at` / `updated_at`，不得信任 `client_updated_at`（裝置時鐘可能不準）。後端寫入記錄時的 `updated_at` 必須是**伺服器當下時間**，而非直接採用請求 body 傳入的值。
- **Retry with backoff**：前端失敗（`network_error`、5xx、或個別 `rejected` 結果）時，會將受影響的佇列項目標記 `failed` 並以指數退避（初始 5 秒，上限 5 分鐘，含隨機抖動）自動重試整批 push；使用者也可在 UI 手動點擊「立即同步」立即重試，不受退避計時器影響。後端**不需要**任何額外的節流／重試專屬邏輯，維持一般 REST 端點的行為即可（若需要限流，回傳標準 429 + `Retry-After`，前端目前會視同一般失敗處理並照原本退避重試）。
- **後端尚未實作期間**：本端點在後端完成前呼叫必定失敗（連線錯誤或 404），前端已將此視為預期中的暫時狀態，佇列會停留在 `pending`／`failed`，UI 顯示「待同步／失敗，將自動重試」，不會拋出未捕捉例外或阻塞其他功能。

---

## 2. 資源總表

34 個資源，依模組分組（順序對齊 `lib/db.ts`）。每個資源皆支援 0.3 節五個標準端點；以下僅列出**欄位形狀**、**額外查詢用途**與**自訂 action**（若有）。所有欄位除標註「必填」外，其餘為選填／可為 `null`；型別以 zod schema 為準。

> 圖例：`PK` 主鍵、`FK→x` 關聯到資源 x 的 id（前端未強制外鍵完整性，屬軟關聯）、`enum` 列舉值、`ISO` = ISO 8601 時間字串、`date` = `YYYY-MM-DD`。

### 2.1 工作模組

#### `tasks`（任務）

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| title | string, 必填, ≤200 | 標題 |
| description | string \| null | 描述 |
| status | enum: `inbox`\|`planned`\|`in_progress`\|`completed`\|`cancelled`（實際值見 `features/tasks/types.ts` TASK_STATUSES） | 預設 `inbox` |
| priority | enum `low`\|`med`\|`high`\|`urgent` | 預設 `med` |
| projectId | string \| null, FK→projects | |
| tags | string[] | 標籤名稱陣列（非 FK，自由字串） |
| dueDate | date \| null | |
| scheduledAt | ISO \| null | |
| estimateMin | int ≥0 \| null | 預估分鐘數 |
| actualMin | int ≥0 \| null | 實際分鐘數 |
| energy | enum `low`\|`med`\|`high` \| null | |
| context | string \| null | |
| recurrenceRule | string \| null | RRULE 子集字串 |
| parentId | string \| null, FK→tasks | 子任務 |
| dependsOn | string[] | 依賴的其他 task id |
| remindAt | ISO \| null | |
| completedAt | ISO \| null | |
| archived | boolean, 預設 false | |

自訂 action：

| Action | 端點 | Body | 說明 |
| --- | --- | --- | --- |
| complete | `POST /api/v1/tasks/{id}/complete/` | 無 | `status→completed`、`completedAt→now` |
| uncomplete | `POST /api/v1/tasks/{id}/uncomplete/` | 無 | `status→planned`、`completedAt→null` |
| snooze | `POST /api/v1/tasks/{id}/snooze/` | `{ "until"?: date, "days"?: int }` | 延後 `dueDate`；`until` 優先於 `days`（未帶 `until` 時以現有 `dueDate`（或今天）+`days`（預設 1）天計算） |

#### `projects`（專案）

| 欄位 | 型別 |
| --- | --- |
| name | string, 必填, ≤120 |
| description | string \| null |
| status | enum `planning`\|`active`\|`on_hold`\|`completed`\|`archived`，預設 `planning` |
| color | string（hex），預設 `#8a6a52` |
| startDate | date \| null |
| targetDate | date \| null |
| progress | number 0–100，預設 0 |
| milestones | `{ id, title, dueDate: date\|null, done: boolean }[]` |

#### `tags`（標籤）

| 欄位 | 型別 |
| --- | --- |
| name | string, 必填, ≤40 |
| color | string（hex），預設 `#6b6b6b` |

#### `calendar_events`（日曆事件）

| 欄位 | 型別 |
| --- | --- |
| title | string, 必填, ≤200 |
| description | string ≤2000 |
| startAt | ISO, 必填 |
| endAt | ISO, 必填 |
| allDay | boolean, 必填 |
| tz | string (IANA), 必填 |
| type | enum `meeting`\|`task`\|`personal`\|`health`\|`reminder`\|`other` |
| recurrenceRule | string（RRULE 子集：FREQ + INTERVAL + COUNT/UNTIL + BYDAY） |
| taskId | string, FK→tasks |
| location | string ≤200 |

#### `timer_sessions`（計時器）

| 欄位 | 型別 |
| --- | --- |
| label | string, 必填, ≤120 |
| category | enum `pomodoro`\|`deep_work`\|`meeting`\|`study`\|`admin`\|`exercise`\|`break`\|`other`，預設 `deep_work` |
| taskId | string \| null, FK→tasks |
| projectId | string \| null, FK→projects |
| status | enum `running`\|`paused`\|`completed`\|`cancelled`，必填 |
| mode | enum `stopwatch`\|`pomodoro`，預設 `stopwatch` |
| targetSeconds | int >0 \| null | 番茄鐘/倒數目標秒數 |
| sessionStartAt | ISO, 必填 | 建立時寫入，不因暫停/恢復改變 |
| accumulatedSeconds | int ≥0，預設 0 | 非執行中已累積秒數 |
| startedAt | ISO \| null | 目前執行段落起點；非 running 時為 null |
| pausedAt | ISO \| null | |
| completedAt | ISO \| null | |
| pomodoroPhase | enum `focus`\|`short_break`\|`long_break` \| null | |
| pomodoroCount | int ≥0，預設 0 | |
| note | string ≤500，預設 "" | |

自訂 action（皆無 body，回傳更新後 record）：

| Action | 端點 | 效果 |
| --- | --- | --- |
| pause | `POST /api/v1/timer_sessions/{id}/pause/` | 僅 `status=running` 時生效：計算已運行秒數併入 `accumulatedSeconds`，`status→paused`，`startedAt→null`，`pausedAt→now` |
| resume | `POST /api/v1/timer_sessions/{id}/resume/` | 僅 `status=paused` 時生效：`status→running`，`startedAt→now`，`pausedAt→null` |
| stop | `POST /api/v1/timer_sessions/{id}/stop/` | `status∈{running,paused}` 時生效：併入已運行秒數，`status→completed`，`startedAt→null`，`completedAt→now`。前端在此之後另呼叫 `time_entries` 的 `POST` 寫入完成區段。 |
| cancel | `POST /api/v1/timer_sessions/{id}/cancel/` | `status∈{running,paused}` 時生效：`status→cancelled`，`startedAt→null`，`completedAt→now` |

> 業務規則：同一使用者同時間只允許一個 `running`/`paused` 的 session（前端 `findActiveSession` 檢查），後端建議也加上此限制（建立/恢復時若已有作用中 session 應拒絕或提示）。

#### `time_entries`（時間紀錄）

| 欄位 | 型別 |
| --- | --- |
| label | string, 必填, ≤120 |
| category | 同 timer_sessions.category，預設 `deep_work` |
| taskId | string \| null, FK→tasks |
| projectId | string \| null, FK→projects |
| timerSessionId | string \| null, FK→timer_sessions |
| startAt | ISO, 必填 |
| endAt | ISO, 必填 |
| durationSeconds | int ≥0, 必填 |
| source | enum `timer`\|`manual`, 必填 |
| note | string ≤500，預設 "" |

### 2.2 個人模組

#### `notes`（筆記）

| 欄位 | 型別 |
| --- | --- |
| title | string, 必填, ≤200 |
| content | string, ≤200000（Markdown） |
| folder | string ≤200（`""`=未分類，巢狀以 `/` 分隔） |
| tags | string[]（每項 ≤40，最多 30 項） |
| pinned | boolean, 必填 |
| isDaily | boolean, 必填 |
| dailyDate | date \| undefined（僅 isDaily=true 時有值） |
| projectId | string, 軟關聯（不強制對應真實 project） |
| projectName | string |
| taskId | string, 軟關聯 |
| taskTitle | string |

自訂 action：

| Action | 端點 | 效果 |
| --- | --- | --- |
| toggleFavorite | `POST /api/v1/notes/{id}/toggle_favorite/` | 反轉 `pinned` |
| restore | `POST /api/v1/notes/{id}/restore/` | `deleted→false`（垃圾桶復原） |

> **筆記不得無聲覆蓋**：`update` 為 PATCH 合併語意，後端遇到並發編輯時不得直接以其中一方靜默覆寫全文，需保留版本快照（見 `note_versions`）並依 `docs/offline-sync.md` 之衝突策略處理。

#### `note_versions`（筆記版本快照）

| 欄位 | 型別 |
| --- | --- |
| noteId | string, 必填, FK→notes |
| title | string |
| content | string |
| folder | string |
| tags | string[] |
| reason | enum `manual_save`\|`auto_snapshot`\|`restore`\|`conflict_branch` |
| noteVersionAtSnapshot | number | 快照當下 `notes.version` 值，供對照 |

> 用途：手動儲存快照、自動快照、還原舊版、以及**離線同步偵測到衝突時建立的分支版本**（`conflict_branch`，見 offline-sync.md）。此資源目前僅需標準 CRUD，無自訂 action；建立分支版本由後端同步邏輯或前端衝突處理流程呼叫 `POST /api/v1/note_versions/`。

#### `habits`（習慣定義）

| 欄位 | 型別 |
| --- | --- |
| name | string, 必填, ≤60 |
| icon | string, 必填, 1–4 字元（emoji） |
| type | enum `boolean`\|`count`\|`numeric`\|`duration`, 必填 |
| unit | string ≤12（count/numeric/duration 用） |
| targetValue | number ≥0, 必填（boolean 固定 1） |
| increment | number ≥0, 必填（一鍵 +1 的預設增量） |
| schedule | `{ type: "daily"|"weekly-days"|"monthly"|"every-n-days", days?: int[0-6][], dayOfMonth?: int[1-31], n?: int[2-90], anchorDate?: date }`, 必填 |
| reminderTime | string `HH:mm` |
| archived | boolean, 必填 |
| notes | string ≤280 |
| sortOrder | number, 必填 |

自訂 action：

| Action | 端點 | 效果 |
| --- | --- | --- |
| archive | `POST /api/v1/habits/{id}/archive/` | 反轉 `archived`（封存／取消封存，不影響歷史 habit_logs） |

#### `habit_logs`（習慣打卡）

| 欄位 | 型別 |
| --- | --- |
| habitId | string, 必填, FK→habits |
| date | date, 必填（本地日期，一天最多一筆彙總） |
| value | number ≥0, 必填（boolean 類型：1=完成，0/不存在=未完成） |
| note | string ≤200 |
| loggedAt | ISO, 必填 |

### 2.3 健康模組

#### `body_metrics`（身形量測）

| 欄位 | 型別 |
| --- | --- |
| date | date, 必填 |
| loggedAt | ISO, 必填 |
| weightKg | number >0, ≤400, 必填 |
| bodyFatPercent | number 0–80 |
| muscleMassKg | number 0–200 |
| skeletalMuscleKg | number 0–150 |
| visceralFatLevel | number 0–60 |
| waistCm / chestCm / hipCm | number 0–300 |
| armCm / calfCm | number 0–120 |
| thighCm | number 0–150 |
| restingHeartRate | number 0–300 |
| bloodPressureSystolic | number 0–300 |
| bloodPressureDiastolic | number 0–200 |
| spo2Percent | number 0–100 |
| bodyTempCelsius | number 25–45 |
| customMetrics | `{ id, label(≤20), value, unit(≤10) }[]` |
| note | string ≤500 |
| source | enum `manual`\|`device`, 必填 |

#### `water_logs`（飲水）

| 欄位 | 型別 |
| --- | --- |
| date | date, 必填 |
| loggedAt | ISO, 必填 |
| amountMl | number >0, ≤5000, 必填 |
| containerLabel | string ≤40 |
| note | string ≤300 |
| source | enum `manual`\|`device`, 必填 |

#### `meal_logs`（飲食）

| 欄位 | 型別 |
| --- | --- |
| date | date, 必填 |
| loggedAt | ISO, 必填 |
| type | enum `breakfast`\|`lunch`\|`dinner`\|`snack`\|`supplement`, 必填 |
| photo | string（dataURL），選填 |
| text | string, 必填 |
| foodTags | string[] |
| portion | string（自由文字） |
| calories / protein / carb / fat / calcium / fiber / water | number ≥0, ≤100000（各自選填） |
| customNutrients | `{ id, label, value, unit? }[]` |
| notes | string |

#### `sleep_logs`（睡眠）

| 欄位 | 型別 |
| --- | --- |
| date | date, 必填（以起床當天為準） |
| bedtime | ISO, 必填 |
| sleepAt | ISO, 必填（須 ≥ bedtime） |
| wakeAt | ISO, 必填（須 > sleepAt） |
| hours | number 0–24, 必填（前端計算後連同請求送出，非後端推導；後端仍應驗證） |
| awakenings | int 0–20，預設 0 |
| quality | int 1–5, 必填 |
| morningEnergy | int 1–5, 必填 |
| preSleepActivity | enum（screen/reading/exercise/meal/caffeine/alcohol/meditation/work/none/other），預設 `none` |
| notes | string ≤500 |

驗證規則（後端應複驗）：`sleepAt ≥ bedtime`；`wakeAt > sleepAt`。

#### `symptom_defs`（症狀定義）

| 欄位 | 型別 |
| --- | --- |
| name | string, 必填, ≤30 |
| category | enum：`疼痛`\|`痠`\|`麻`\|`腫脹`\|`疲勞`\|`頭痛`\|`情緒`\|`壓力`\|`自訂`, 必填 |
| note | string ≤200 |
| archived | boolean, 必填 |

#### `symptom_logs`（症狀發作紀錄）

| 欄位 | 型別 |
| --- | --- |
| symptomDefId | string, 必填, FK→symptom_defs |
| date | date, 必填 |
| startAt | ISO, 必填 |
| intensity | number 0–10, 必填 |
| bodyLocation | string ≤30 |
| durationMin | number 0–10080 |
| triggers | string[]（每項 ≤20，最多 10） |
| relief | string[]（每項 ≤20，最多 10） |
| notes | string ≤500 |
| photo | string（dataURL） |

> 產品邊界：本資源不提供任何自動診斷／風險評分欄位或邏輯。

#### `medications`（藥物）／`supplements`（保健品，同構）

兩者欄位完全相同，分屬不同資料表：

| 欄位 | 型別 |
| --- | --- |
| name | string, 必填, ≤80 |
| dose | number ≥0, 必填 |
| unit | string, 必填, ≤20 |
| frequency | enum `daily`\|`specific-days`\|`every-n-days`\|`as-needed`, 必填 |
| daysOfWeek | int[0-6][]（specific-days 用） |
| intervalDays | int 2–90（every-n-days 用） |
| times | string[]（`HH:mm`，as-needed 可空陣列），必填 |
| startDate | date, 必填 |
| endDate | date |
| withFood | enum `with_food`\|`empty_stomach`\|`either`, 必填 |
| remainingQty | number ≥0（未填代表不追蹤庫存） |
| refillReminder | `{ enabled: boolean, thresholdQty: number }` |
| active | boolean, 必填 |
| notes | string ≤280 |

自訂 action（兩資源各自）：

| Action | 端點 | 效果 |
| --- | --- | --- |
| toggleActive | `POST /api/v1/medications/{id}/toggle-active/`、`POST /api/v1/supplements/{id}/toggle-active/` | 反轉 `active`（不刪除歷史紀錄，停止補貨提醒） |

> 產品邊界：**不得**新增「安全等級」「建議劑量」「交互作用」等欄位或衍生判斷邏輯。

#### `medication_schedules`（服用時段）

| 欄位 | 型別 |
| --- | --- |
| medicationId | string, 必填, FK→medications 或 supplements |
| sourceType | enum `medication`\|`supplement`, 必填 |
| timeOfDay | string `HH:mm`, 必填 |
| label | string ≤40 |
| active | boolean, 必填 |

#### `medication_logs`（服用／漏服紀錄）

| 欄位 | 型別 |
| --- | --- |
| medicationId | string, 必填 |
| sourceType | enum `medication`\|`supplement`, 必填 |
| scheduleId | string, FK→medication_schedules |
| scheduledFor | ISO, 必填 |
| status | enum `taken`\|`missed`\|`skipped`, 必填 |
| takenAt | ISO（僅 status=taken 有意義） |
| quantity | number ≥0（預設等於藥物 dose） |
| note | string ≤200 |

#### `workouts`（訓練紀錄）

| 欄位 | 型別 |
| --- | --- |
| date | date, 必填 |
| startAt | ISO, 必填 |
| endAt | ISO |
| type | enum（WORKOUT_TYPES，見 `features/workouts/types.ts`）, 必填 |
| goal | string ≤200 |
| durationMin | number 1–1000, 必填 |
| rpe | number 1–10 |
| avgHr | number 0–260 |
| calories | number 0–6000 |
| notes | string ≤1000 |
| feeling | enum（FEELINGS）, 必填 |
| distanceKm | number 0–500（有氧專屬） |
| paceMinPerKm | number 0–60 |
| avgSpeedKmh | number 0–120 |
| steps | number 0–200000 |
| isTemplate | boolean，預設 false（範本標記，非獨立資料表） |
| templateName | string ≤60 |

#### `exercise_defs`（動作庫）

| 欄位 | 型別 |
| --- | --- |
| name | string, 必填, ≤60 |
| category | enum（MUSCLE_GROUPS）, 必填 |
| equipment | string ≤60 |
| isCustom | boolean，預設 true |
| notes | string ≤300 |

#### `workout_exercises`（訓練 × 動作）

| 欄位 | 型別 |
| --- | --- |
| workoutId | string, 必填, FK→workouts |
| exerciseDefId | string, 必填, FK→exercise_defs |
| order | int ≥0, 必填 |
| notes | string ≤300 |

#### `workout_sets`（組數）

| 欄位 | 型別 |
| --- | --- |
| workoutExerciseId | string, 必填, FK→workout_exercises |
| order | int ≥0, 必填 |
| reps | int 0–1000 |
| weightKg | number 0–500 |
| restSec | int 0–1800 |
| rpe | number 1–10 |
| rir | number 0–10 |
| side | enum（SET_SIDES） |
| isWarmup | boolean，預設 false |
| isWorking | boolean，預設 true |
| isPr | boolean，預設 false |

#### `rehab_plans`（復健計畫）

| 欄位 | 型別 |
| --- | --- |
| name | string, 必填, ≤60 |
| bodyRegion | string ≤30 |
| diagnosis | string ≤120 |
| goal | string ≤200 |
| therapistName | string ≤30 |
| clinicName | string ≤40 |
| active | boolean, 必填 |
| startDate | date, 必填 |
| nextAppointmentAt | date |
| generalCautions | string ≤300 |
| reviewNotes | `{ id, date, note, adjustment?: boolean }[]`，預設 `[]` |
| note | string ≤500 |

自訂 action：

| Action | 端點 | 效果 |
| --- | --- | --- |
| toggleActive | `POST /api/v1/rehab_plans/{id}/toggle-active/` | 反轉 `active`（暫停／恢復，不刪除任何處方或歷史） |

#### `rehab_exercises`（復健項目 / 處方）

| 欄位 | 型別 |
| --- | --- |
| rehabPlanId | string, 必填, FK→rehab_plans |
| name | string, 必填, ≤60 |
| instructions | string ≤600 |
| media | string ≤300（教學圖片/影片連結） |
| sets | int 0–50 |
| reps | int 0–500 |
| durationSec | int 0–7200 |
| loadLimit | string ≤40（治療師開立，使用者不可自行調高） |
| angle | string ≤40 |
| cautions | string ≤300 |
| frequency | string ≤60 |
| therapistNote | string ≤300 |
| effectiveDate | date, 必填 |
| stopDate | date（留空代表持續執行中） |
| order | int |

> **系統不得自行增加復健強度或建議加量**：`sets`/`reps`/`durationSec`/`loadLimit`/`angle`/`frequency` 僅能由使用者透過表單 `PATCH` 主動變動；後端不得提供任何自動調整端點或邏輯。

#### `rehab_sessions`（單日執行紀錄）

| 欄位 | 型別 |
| --- | --- |
| rehabPlanId | string, 必填, FK→rehab_plans |
| rehabExerciseId | string, 必填, FK→rehab_exercises |
| date | date, 必填 |
| done | boolean, 必填 |
| actualSets | int 0–50 |
| actualReps | int 0–500 |
| actualTime | int 0–7200（秒） |
| discomfortBefore | int 0–10 |
| discomfortAfter | int 0–10 |
| load | string ≤40 |
| notes | string ≤300 |

自訂 action：

| Action | 端點 | 效果 |
| --- | --- | --- |
| toggleDone | `POST /api/v1/rehab_sessions/{id}/toggle-done/` | 反轉 `done`，不影響其他實際數值欄位 |

#### `health_documents`（健康文件／附件）

| 欄位 | 型別 |
| --- | --- |
| date | date, 必填（檢驗/看診當日，非上傳時間） |
| category | enum：`檢驗報告`\|`影像報告`\|`診斷證明`\|`收據/費用`\|`轉診單`\|`病歷摘要`\|`其他`, 必填 |
| title | string, 必填, ≤80 |
| provider | string ≤60 |
| fileName | string ≤120 |
| mimeType | string ≤60 |
| fileDataUrl | string（附件內容 data URL；登入模式由後端決定實際儲存策略，建議改為物件儲存 URL 而非內嵌 base64） |
| fileSizeKb | number ≥0 |
| appointmentId | string, FK→appointments |
| notes | string ≤500 |

#### `appointments`（回診／看診）

| 欄位 | 型別 |
| --- | --- |
| startAt | ISO, 必填 |
| endAt | ISO |
| doctor | string ≤40 |
| department | string ≤40 |
| location | string, 必填, ≤80 |
| reason | string ≤200 |
| status | enum `scheduled`\|`completed`\|`cancelled`\|`no_show`, 必填 |
| reminderMinutesBefore | int 0–10080 |
| followUpNeeded | boolean, 必填 |
| notes | string ≤500 |

#### `activities`（日活動量彙總）

| 欄位 | 型別 |
| --- | --- |
| type | 固定字面值 `"daily_summary"`, 必填 |
| occurredAt | ISO, 必填（通常為當日 00:00） |
| date | date, 必填 |
| steps | number 0–200000 |
| walkTimeMin / standTimeMin / activeMin / sedentaryMin | number 0–1440 |
| distanceKm | number 0–500 |
| source | enum `manual`\|`apple_health`\|`wearable`\|`import`, 必填 |
| isPrimary | boolean, 必填（標記「此日期採計此筆為主要來源」，避免同日多來源被無聲加總） |
| notes | string ≤300 |

### 2.4 系統／橫向模組

#### `user_profile`（個人基本資料，singleton）

| 欄位 | 型別 |
| --- | --- |
| displayName | string ≤40 |
| heightCm | number 50–260 |
| weightKg | number 20–400 |
| birthYear | int 1900–今年 |
| sex | enum `female`\|`male`\|`other`\|`unspecified` |
| activityLevel | enum `sedentary`\|`light`\|`moderate`\|`active`\|`very_active` |
| fitnessGoal | enum `lose_weight`\|`maintain`\|`build_muscle`\|`improve_endurance`\|`general_health` |
| waterGoalMl | int 500–8000 |
| sleepGoalHours | number 3–14 |
| stepGoalSteps | int 1000–50000 |
| healthDataVisibility | enum `private`\|`shared`, 必填（健康資料預設 `private`，分享需使用者主動切換） |

> Singleton 慣例：每位使用者僅一筆現行設定。前端以 `useSingleton()` hook 包裝：`list()` 取回空清單時自動 `create()` 一筆預設值。後端 `list` 對該使用者應固定回傳最多一筆；`create` 若已存在應回傳既有那筆（或依 409 由前端捕捉後改走 `update`——目前前端邏輯是「空清單才 create」，尚未處理 409，後端應確保同一使用者不會產生第二筆 singleton 記錄，建議以 `user_id` 唯一索引保護）。

#### `user_preferences`（使用偏好，singleton）

| 欄位 | 型別 |
| --- | --- |
| purposes | enum[]（`work`\|`health`\|`habit`\|`notes`），必填 |
| enabledModules | string[], 必填 |
| onboardingCompleted | boolean, 必填 |
| onboardingStep | int 0–4, 必填 |
| onboardingSkipped | boolean, 必填 |

#### `notification_prefs`（通知偏好，singleton）

| 欄位 | 型別 |
| --- | --- |
| channels | `{ taskReminders, habitReminders, medicationReminders, waterReminders, workoutReminders, appointmentReminders, weeklySummary: boolean }`，全部必填 |
| quietHoursEnabled | boolean, 必填 |
| quietHoursStart | string `HH:mm`, 必填 |
| quietHoursEnd | string `HH:mm`, 必填 |
| timezone | string（IANA）, 必填 |

#### `dashboard_layout`（總覽版面設定，singleton）

| 欄位 | 型別 |
| --- | --- |
| widgets | `{ key: string, visible: boolean, order: number }[]`，必填。`key` 為 `WIDGET_KEYS` 之一：`greeting`/`quickAdd`/`topTasks`/`todaySchedule`/`overdueTasks`/`activeTimer`/`completionRate`/`water`/`activity`/`healthStatus`/`habits`/`suggestions`/`recentNotes` |

---

## 附錄 A：自訂 Action 總表

| 資源 | Action | 端點 |
| --- | --- | --- |
| tasks | complete | `POST /api/v1/tasks/{id}/complete/` |
| tasks | uncomplete | `POST /api/v1/tasks/{id}/uncomplete/` |
| tasks | snooze | `POST /api/v1/tasks/{id}/snooze/` |
| timer_sessions | pause | `POST /api/v1/timer_sessions/{id}/pause/` |
| timer_sessions | resume | `POST /api/v1/timer_sessions/{id}/resume/` |
| timer_sessions | stop | `POST /api/v1/timer_sessions/{id}/stop/` |
| timer_sessions | cancel | `POST /api/v1/timer_sessions/{id}/cancel/` |
| notes | toggleFavorite | `POST /api/v1/notes/{id}/toggle_favorite/` |
| notes | restore | `POST /api/v1/notes/{id}/restore/` |
| habits | archive | `POST /api/v1/habits/{id}/archive/` |
| medications | toggleActive | `POST /api/v1/medications/{id}/toggle-active/` |
| supplements | toggleActive | `POST /api/v1/supplements/{id}/toggle-active/` |
| rehab_plans | toggleActive | `POST /api/v1/rehab_plans/{id}/toggle-active/` |
| rehab_sessions | toggleDone | `POST /api/v1/rehab_sessions/{id}/toggle-done/` |

共 **14** 個自訂 action。

## 附錄 B：端點數量統計

- 標準 CRUD：34 個資源 × 5 端點（list/create/retrieve/update/delete）= **170**
- 自訂 action：**14**
- Auth：**3**（register / login / logout）
- 帳號層級：**2**（export / purge）
- Sync（本機模式登入後可選開啟同步）：**2**（`POST /api/v1/sync/` push、`GET /api/v1/sync/` pull，見 §1.2）

**總計：191 個 API 端點。**

## 附錄 C：資源 → 資料模組對照

| 模組（features/） | 擁有的資源（可寫入） |
| --- | --- |
| tasks | tasks, projects, tags |
| calendar | calendar_events |
| focus | timer_sessions, time_entries |
| notes | notes, note_versions |
| habits | habits, habit_logs |
| body | body_metrics, water_logs（user_profile 唯讀） |
| nutrition | meal_logs |
| sleep | sleep_logs |
| symptoms | symptom_defs, symptom_logs |
| meds | medications, medication_schedules, medication_logs, supplements |
| workouts | workouts, workout_exercises, workout_sets, exercise_defs |
| rehab | rehab_plans, rehab_exercises, rehab_sessions |
| timeline | health_documents, appointments, activities |
| settings | user_profile, user_preferences, notification_prefs |
| dashboard | dashboard_layout |

其餘模組對非自身擁有的資源皆為**唯讀彙整**（例如 dashboard 讀取 tasks/habits/water_logs 等；timeline 讀取 symptom_logs/workouts/rehab_sessions 等）；後端不需為此另建端點，沿用資源本身的 `GET /api/v1/{name}/` 即可。
