# DailyOS — 離線／同步策略（Offline & Sync Contract）

> 本文件說明「試用（Trial）」與「登入（Auth）」兩種資料流的實際運作方式，
> 以及未來若要打通「試用資料匯入登入帳號」或「登入模式支援離線佇列」時，
> 應遵循的同步欄位與衝突策略。
>
> 對應程式碼：`frontend/src/lib/resource.ts`（transport 切換與衝突處理起點）、
> `frontend/src/lib/db.ts`（Dexie schema）、`frontend/src/lib/http.ts`（REST client）、
> `frontend/src/lib/mode.ts`（模式切換）。

---

## 1. 兩種資料流總覽

```
                daios_mode cookie
                       │
        ┌──────────────┴───────────────┐
        │ "trial"                      │ "auth"
        ▼                               ▼
┌───────────────────┐          ┌─────────────────────┐
│ Dexie (IndexedDB)  │          │ REST /api/v1/{name}/ │
│ 瀏覽器本機，單一裝置 │          │ 伺服器，多裝置共用     │
│ 無需登入、無需網路   │          │ 需要 Bearer token     │
│ 首次讀取 lazy-seed  │          │ 由後端持久化           │
└───────────────────┘          └─────────────────────┘
```

- **UI／元件層完全相同**：所有畫面一律透過 `createResource(name, schema, seed, actions)` 產生的 `Repo<T>` 存取資料，不知道也不關心目前是哪個 transport。
- **切換依據**：`lib/mode.ts` 讀寫的 cookie `daios_mode`（`"trial"` | `"auth"`）。`lib/resource.ts` 內的 `impl.list/get/create/update/remove` 用 `isAuth()` 判斷呼叫 `trial.*`（Dexie）或 `auth.*`（`httpResource` 封裝的 fetch）。
- **目前版本不存在「背景同步佇列」**：試用模式資料只存在該瀏覽器的 IndexedDB，不會自動上傳；登入模式資料每次操作即時打 API，沒有離線暫存 — 若斷線，操作直接失敗並顯示錯誤 toast（見 `http.ts` 的 `network_error`）。「離線／同步」目前的實際意涵是「試用 vs. 登入兩套獨立資料來源如何在未來合併」，而非「登入模式下的斷線續傳」。本文件第 4 節列出若要補上真正的離線佇列／帳號合併功能時應遵循的規則。

### 1.1 試用模式（Trial）資料流

1. 使用者於落地頁選擇「試用」→ `setMode("trial")`，不需註冊。
2. 每個資源第一次呼叫 `list()`／`get()` 時，`ensureSeeded()` 檢查該 Dexie 資料表是否為空；若是空的才呼叫模組提供的 `seed()` 產生種子資料並 `bulkPut`（每張表僅 seed 一次，以記憶體中的 `seededTables` Set 防止重複）。
3. `create()`／`update()` 一律先以 zod `schema.safeParse()` 驗證，失敗回傳 422 格式的 `ApiRequestError`（與登入模式錯誤格式一致，UI 處理邏輯共用）。
4. `remove()` 為軟刪除：`deleted=true`、`version+1`、`updatedAt=now`，不會實際從 IndexedDB 移除該筆記錄（保留 tombstone）。
5. 所有資料僅存在**該瀏覽器**（同裝置、同瀏覽器 profile）；換裝置、清除瀏覽器資料、換瀏覽器皆會遺失，UI 需明確告知此限制（見 README「已知限制」）。

### 1.2 登入模式（Auth）資料流

1. 使用者註冊／登入 → 後端回傳 `{ token, user }` → 前端 `setToken(token)` 寫入 cookie `daios_token`，並 `setMode("auth")`。
2. 之後每個資源操作直接呼叫對應 REST 端點（見 `docs/api-design.md`），由 `lib/http.ts` 負責：
   - 帶上 `Authorization: Bearer <token>`；
   - 請求 body camelCase → snake_case；回應 body snake_case → camelCase；
   - 非 2xx 回應一律轉為 `ApiRequestError`（`{status, code, message, fieldErrors, requestId}`）。
3. 資料持久化與跨裝置同步完全交給後端資料庫；前端不做任何額外快取持久化（react-query 快取僅存於記憶體，重新整理頁面即消失，之後重新 `fetch`）。

---

## 2. 同步欄位（Sync Fields）

所有可同步資源皆繼承 `BaseRecord`（`lib/types.ts`）：

| 欄位 | 型別 | 用途 |
| --- | --- | --- |
| `id` | string (uuid) | 全域唯一主鍵。試用模式由前端 `newId()`（`crypto.randomUUID()`）產生；登入模式建議由**前端產生並隨 create 請求送出**（見下方「why client-generated id」），後端接受該值作為主鍵。 |
| `version` | number (int, 從 1 開始) | 單調遞增版本號，每次成功寫入（`create`/`update`/`remove`/自訂 action）一律 `+1`。**目前僅作顯示與未來同步判斷用途，非強制併發鎖**（後端不需要 `If-Match`／409 機制；見 `docs/api-design.md` §0.9）。 |
| `updatedAt` | string (ISO 8601) | 最後修改時間；每次寫入更新為當下時間。是目前唯一實際用於「較新覆蓋較舊」判斷的欄位。 |
| `createdAt` | string (ISO 8601) | 建立時間，寫入後不再變動。 |
| `deleted` | boolean | 軟刪除旗標。`false`＝有效，`true`＝已刪除但保留 tombstone。`list()` 預設過濾掉 `deleted=true` 的記錄，除非帶 `?deleted=true`（供垃圾桶／還原 UI）。 |

### 2.1 為什麼 `id` 由前端產生（client-generated id）

- 試用模式下，樂觀更新（optimistic update）需要在等待伺服器回應前就把新記錄放進 UI／react-query 快取，因此 `id` 必須在送出請求「之前」就已知。
- 登入模式沿用同一套 `create(input: Partial<T>)` 介面，若 `input.id` 已帶值，後端應以該值作為主鍵寫入（`upsert` 而非自動遞增）；若未帶值則後端可自行產生。
- **未來若要支援「試用資料匯入登入帳號」**：因為 `id` 在試用模式建立時已經是全域唯一的 uuid，匯入時可直接以相同 `id` `POST` 到對應資源，後端只需在該 `id` 已存在時視為衝突（見第 3.4 節），不需要重新映射 id、也不會破壏跨資源的 FK 參照（例如 `tasks.id` 被 `calendar_events.taskId` 引用）。

---

## 3. 衝突策略（Conflict Strategy）

依資源的「資料敏感度」分三種等級，**不是所有資源都適用同一種策略**：

### 3.1 一般資源：Server-wins（登入模式現況）

適用於絕大多數資源（tasks／habits／body_metrics／workouts／…）。

- 登入模式下，前端目前**沒有離線寫入佇列**：每次 `update()` 都是即時打 `PATCH`，若請求成功，伺服器當下的結果就是唯一真相，前端樂觀更新的本地值會在 `onSettled` 時以 `invalidateQueries` 重新 `fetch` 校正。
- 若未來加入真正的離線佇列（見第 4 節），對這類資源建議採 **Server-wins**：伺服器保有最新 `version`／`updatedAt` 者為準，用戶端排隊中的舊版本寫入若被伺服器判定為「基於過期版本」，直接以 409 回絕，前端提示「此筆資料已在其他裝置被更新，請重新整理」，不嘗試自動合併欄位。
- 理由：這些資源的欄位大多是結構化數值／列舉／單一狀態機（例如 `tasks.status`、`timer_sessions.status`），欄位級合併（field-level merge）容易產生語意錯誤的中間狀態（例如合併出 `status=running` 但 `startedAt=null`）。

### 3.2 高頻小顆粒資源：LWW（Last-Write-Wins，以 `updatedAt` 判斷）

適用於使用者短時間內連續操作、單次寫入語意單純、欄位少的資源：`habit_logs`（打卡）、`water_logs`（飲水）、`medication_logs`（服用紀錄）、`workout_sets`（組數）。

- 若同一筆記錄在兩個裝置上短時間內都被建立/修改（例如同一天打卡兩次、離線期間各自新增了飲水紀錄），**不視為衝突**，而是各自成立獨立記錄（`habit_logs`／`water_logs` 等本身就是「單次事件記錄」而非「單一狀態」，天然可疊加，交由 UI 彙總層以 `date` 分組加總，不需要合併同一筆 id）。
- 若確實是同一筆記錄的欄位更新（例如修正某次飲水量），採 LWW：`updatedAt` 較新者覆蓋較舊者，不需使用者介入。

### 3.3 筆記（`notes` / `note_versions`）：**禁止無聲覆蓋**，手動合併

筆記是自由文字內容，欄位級合併或 LWW 直接覆蓋都可能造成**使用者辛苦寫的內容悄悄消失**，是本產品明確禁止的行為。規則：

1. **每次成功儲存（`PATCH /api/v1/notes/{id}/`）前，後端必須先建立一筆 `note_versions` 快照**（`reason="manual_save"` 或 `"auto_snapshot"`），保存寫入前的 `title`／`content`／`folder`／`tags` 與當下的 `noteVersionAtSnapshot`（快照當下 `notes.version`）。這是「筆記不得無聲覆蓋」的最後防線：即使真的發生覆蓋，使用者仍可從版本歷史還原。
2. **偵測衝突**：前端送出 `PATCH` 時應一併帶上使用者開始編輯當下讀到的 `version`（`baseVersion`）。若後端目前的 `notes.version` 已經大於 `baseVersion`（代表期間有其他裝置也寫入過），**不得直接覆蓋**，後端回傳 `409 Conflict`（沿用標準錯誤格式，`code: "conflict"`）。
3. **前端衝突處理**（後端只需誠實回報 409，UI 行為如下，供後端理解全流程）：
   - 不放棄使用者剛輸入的內容：以 `reason="conflict_branch"` 呼叫 `POST /api/v1/note_versions/` 建立一筆分支版本，保存使用者本地的編輯內容；
   - 提示使用者「這篇筆記在其他地方也被修改過」，並排列出：目前伺服器版本、使用者本地版本（即剛建立的 `conflict_branch`）兩者供比對；
   - 由使用者手動選擇「保留伺服器版本」「保留我的版本」或「手動合併後另存」，本模組**不提供自動合併演算法**。
4. `note_versions` 只新增不刪除（除非整篇筆記被 `purge`），做為稽核與復原依據。

> 目前前端程式碼尚未實作 409 偵測與 `baseVersion` 傳遞（`resource.ts` 的 `update()` 是無條件 `PATCH`）；後端實作時仍應遵循「筆記寫入前先快照」這條規則，即使 409 機制尚未串接，快照本身已能防止資料完全遺失，也是未來補上衝突偵測 UI 時唯一需要的資料基礎。

### 3.4 匯入 / 帳號合併時的 id 衝突

若同一 `id` 已存在於目標帳號（例如試用資料匯入登入帳號、或雙裝置各自產生過同 id 的極端情況）：

- 一般資源：視為 **409**，由呼叫端（匯入流程）決定是略過、覆蓋（需使用者確認）或改配新 id 後重新關聯外鍵。
- 筆記類資源：一律**不覆蓋**，以新 id 匯入為獨立記錄，並在標題附註「（匯入於 YYYY-MM-DD）」，避免筆記內容無聲消失。

---

## 4. 若要補上真正的離線佇列（現況不存在，未來擴充建議）

目前登入模式**沒有**離線寫入佇列 — 這是明確的已知限制（見 README）。若後續要支援「登入模式下離線也能操作，恢復連線後自動同步」，建議：

- 沿用 `BaseRecord` 既有的 `id`／`version`／`updatedAt`／`deleted` 四個欄位即可，不需新增欄位；`deleted` 的軟刪除設計已經是「同步友善」的（tombstone 可被同步而非直接消失）。
- 前端另外需要一個**僅存在本地、不同步**的 `syncStatus` 概念（`"synced" | "pending" | "conflict"`），用於 UI 顯示「尚未同步」徽章；此欄位**不應**加進後端 API 的 `BaseRecord`，因為它是純前端佇列狀態，與伺服器端的資料模型無關 —— 若未來要落地，建議放在前端本地的 Dexie 佇列表（例如 `_sync_queue`），而非污染各資源的 schema。
- 佇列送出時機：偵測到 `navigator.onLine` 恢復或定時重試；依 §3.1–3.3 規則決定各資源的合併策略。
- 本文件第 3 節的策略表即為屆時佇列 replay 時應遵循的規則來源，實作前不需另外重新設計衝突模型。

## 5. 快速對照表

| 資源類別 | 範例 | 衝突策略 | 是否允許自動覆蓋 |
| --- | --- | --- | --- |
| 狀態機 / 結構化欄位 | tasks, habits, workouts, rehab_plans, medications | Server-wins | 是（伺服器最新值為準，409 時整筆拒絕，不欄位合併） |
| 高頻事件型記錄 | habit_logs, water_logs, medication_logs, workout_sets, time_entries | LWW（`updatedAt`） | 是（同筆記錄可覆蓋；不同筆天然疊加不衝突） |
| 自由文字內容 | notes, note_versions | 手動合併，寫入前必快照 | **否**，偵測到衝突需 409 + 使用者介入 |
| Singleton 設定 | user_profile, user_preferences, notification_prefs, dashboard_layout | Server-wins（單筆保護） | 是；後端應以 `user_id` 唯一索引避免重複建立 |
