# DailyOS — 離線／同步策略（Offline & Sync Contract）

> 本文件說明「試用（Trial）」「本機（Local）」「登入（Auth）」三種資料流的實際運作方式，
> 以及第 6 節「本機模式登入後可選開啟雲端同步」這條**已實作**的路徑（`frontend/src/features/sync/**`）
> 應遵循的同步欄位與衝突策略。第 4 節保留原本「若要補上真正的離線佇列」的分析——
> 該分析正是第 6 節實作依循的設計依據，兩節內容一致，不衝突。
>
> 對應程式碼：`frontend/src/lib/resource.ts`（transport 切換與 `registerLocalWriteObserver`）、
> `frontend/src/lib/db.ts`（Dexie schema）、`frontend/src/lib/http.ts`（REST client）、
> `frontend/src/lib/mode.ts`（模式切換：`trial` / `local` / `auth`）、
> `frontend/src/features/sync/**`（本機模式的同步引擎：佇列、push/pull、衝突處理、`<SyncSection/>`）。

---

## 1. 三種資料流總覽

```
                        daios_mode cookie
                               │
        ┌──────────────────────┼───────────────────────┐
        │ "trial"               │ "local"                │ "auth"
        ▼                       ▼                        ▼
┌───────────────────┐  ┌────────────────────┐   ┌─────────────────────┐
│ Dexie (IndexedDB)  │  │ Dexie (IndexedDB)   │   │ REST /api/v1/{name}/ │
│ DaiOSDB_trial       │  │ DaiOSDB              │   │ 伺服器，多裝置共用     │
│ demo、可隨時重置      │  │ 真實資料、不 seed      │   │ 需要 Bearer token     │
│ 無需登入、無需網路     │  │ 無需登入、無需網路       │   │ 由後端持久化           │
│ 首次讀取 lazy-seed    │  │ 可安裝 PWA／本機提醒    │   │                       │
│                    │  │ 登入後可選開啟雲端同步   │   │                       │
└───────────────────┘  └────────────────────┘   └─────────────────────┘
                               │
                     登入 + 開啟同步開關時
                               ▼
                  features/sync/**（見第 6 節）
                  批次 push/pull /api/v1/sync/
```

- **UI／元件層完全相同**：所有畫面一律透過 `createResource(name, schema, seed, actions)` 產生的 `Repo<T>` 存取資料，不知道也不關心目前是哪個 transport。`trial` 與 `local` 共用同一套 Dexie 程式碼路徑（差別只在 `lib/db.ts` 的資料庫名稱與是否 lazy-seed），`auth` 走 REST。
- **切換依據**：`lib/mode.ts` 讀寫的 cookie `daios_mode`（`"trial"` | `"local"` | `"auth"`）。`lib/resource.ts` 內的 `impl.list/get/create/update/remove` 用 `isAuth()` 判斷呼叫 `trial.*`（Dexie，`trial`／`local` 共用）或 `auth.*`（`httpResource` 封裝的 fetch）。
- **背景同步佇列僅存在於「本機模式 + 已登入 + 使用者手動開啟」時**：試用模式資料只存在該瀏覽器的 IndexedDB，不會自動上傳；登入模式資料每次操作即時打 API，沒有離線暫存 — 若斷線，操作直接失敗並顯示錯誤 toast（見 `http.ts` 的 `network_error`）。本機模式預設也**不**自動上傳，使用者需在設定頁 `<SyncSection/>` 主動開啟同步開關（見第 6 節），開啟後 `lib/resource.ts` 的 `registerLocalWriteObserver` 才會把每次 Dexie 寫入排入 `features/sync/**` 的佇列，背景批次 push/pull。第 4 節列出若要補上真正的離線佇列／帳號合併功能時應遵循的規則，第 6 節是該分析在「本機模式」情境下的實作落地。

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

### 1.3 本機模式（Local）資料流

1. 使用者於落地頁選擇「本機」→ `setMode("local")`，不需註冊；資料存在獨立的 `DaiOSDB`（見 `lib/db.ts` `DB_NAME_LOCAL`），與試用模式的 `DaiOSDB_trial` 完全隔離，不互相污染。
2. 與試用模式共用 `lib/resource.ts` 的 `trial.*` transport 實作（`ensureSeeded`／`create`／`update`／`remove` 邏輯相同），差別只有：本機模式**不會** lazy-seed（`ensureSeeded()` 內以 `isTrial()` 判斷，`local` 一律略過），起始為空、完全是使用者自己輸入的真實資料。
3. 可安裝為 PWA、使用本機提醒（Notification Triggers，限 Chromium；見 README 已知限制）、JSON 匯出/匯入以跨電腦搬移資料。
4. **登入後可選擇開啟雲端同步**：使用者於「本機」模式下額外完成登入（取得 `daios_token`，但**不**切換 `daios_mode` 為 `"auth"` — 仍是 `local` 模式，只是多了 token）後，設定頁的 `<SyncSection/>`（`features/sync/components/sync-section.tsx`）會顯示同步開關；開啟後：
   - `lib/resource.ts` 每次本地寫入都會透過 `registerLocalWriteObserver` 通知 `features/sync/engine.ts` 註冊的觀察者，寫入 `features/sync/db.ts` 的獨立 Dexie 資料庫（`DaiOSDB_sync`）的 `sync_mutations` 佇列表。
   - 佇列以批次 `POST /api/v1/sync/` push、`GET /api/v1/sync/?since=cursor` pull 的方式與後端同步，詳細契約見 `docs/api-design.md` §1.2、`docs/openapi.yaml`；衝突處理見本文件第 6 節（延伸自第 3 節的一般策略）。
   - 關閉開關、或未登入、或處於 `trial`/`auth` 模式時，`features/sync/**` 的 `initSync()` 皆為 no-op，不會產生任何佇列項目或網路請求。

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

---

## 6. 本機模式↔雲端同步引擎（已實作，`features/sync/**`）

本節是第 4 節「若要補上真正的離線佇列」分析的**實際落地**，適用範圍限定在「本機（local）模式 + 已登入 + 使用者手動開啟同步」（見 §1.3 第 4 點）。第 2、3 節定義的同步欄位與衝突策略在此**原封不動沿用**，本節只補「佇列怎麼跑」與「pull 回來的變更怎麼套用」。

### 6.1 元件與資料流

```
使用者操作（新增/編輯/刪除）
        │
        ▼
createResource().create/update/remove（lib/resource.ts）
        │  寫入 Dexie（DaiOSDB）成功後
        ▼
notifyLocalWrite(name, op, id) → registerLocalWriteObserver 的訂閱者
        │
        ▼
features/sync/engine.ts：enqueueLocalWrite()
   （只在 isLocal() && 使用者已開啟同步開關 && getToken() 有值 時真的入列；
    其餘情況直接略過，不建立佇列項目、不佔用 IndexedDB 空間）
        │  讀回 Dexie 最新快照，寫入 sync_mutations（獨立 Dexie DB：DaiOSDB_sync）
        ▼
sync_mutations: { id, resource, op, recordId, payload, clientMutationId, createdAt, status }
        │
        │  triggerSync()：手動點擊「立即同步」／每 60 秒自動／連線恢復（online 事件）／失敗後 backoff 重試
        ▼
POST /api/v1/sync/（批次 push，見 docs/api-design.md §1.2.1）──► 逐筆 applied/conflict/rejected
        │
        ▼
GET /api/v1/sync/?since=cursor（pull，見 §1.2.2）──► changes[] 逐筆套用回本地 Dexie（DaiOSDB）
```

- 佇列表 `sync_mutations` 與衝突表 `sync_conflicts`、游標表 `sync_meta` 皆存在**獨立**的 Dexie 資料庫 `DaiOSDB_sync`，不混進使用者實際資料的 `DaiOSDB`——避免匯出/匯入、重置示範資料等既有的全表遍歷邏輯（`DB_TABLE_NAMES`）誤觸碰同步引擎的內部簿記。
- `sync_mutations` 的 `payload` 是**入列當下**從 Dexie 讀回的完整記錄快照（而非觀察者事件本身攜帶的資料），確保 push 時送出的是寫入完成後的最終狀態。

### 6.2 Push：批次送出 + 冪等 + 結果分派

- 每次 `triggerSync()` 會把目前所有 `status ∈ {pending, failed}` 的佇列項目一次性批次送到 `POST /api/v1/sync/`，送出前先標記 `status="syncing"`。
- 每筆 mutation 攜帶固定不變的 `clientMutationId`（同一佇列項目重試多次，此值不變），對應後端冪等去重鍵，見 `docs/api-design.md` §1.2.1／§1.2.3。
- 回應逐筆 `results[]` 依 `status` 分派：
  - `applied` → 從佇列移除（視為已同步；不保留「已同步」歷史，佇列只放尚未完成的項目，避免無限增長）。
  - `conflict` → 一般資源等同 `applied` 直接移除（伺服器已依 server-wins 套用最新版本，接下來的 pull 會把最終結果帶回本地）；`notes` 等手動合併資源同樣從佇列移除，但由**pull 階段**（見 6.3）依據伺服器同時回傳的變更建立 `sync_conflicts` 記錄，不在 push 階段直接建立（因為 push 回應只知道「衝突了」，完整的雙方內容比對交給 pull 階段讀到的 `record` 統一處理，避免兩處邏輯各自維護一份衝突偵測規則）。
  - `rejected` → 標記 `status="failed"`、`retryCount+1`、記錄 `lastError`，停止自動重試該筆內容本身（除非使用者手動編輯後產生新的佇列項目），但仍會顯示於 UI 供使用者查看。

### 6.3 Pull：套用伺服器變更與衝突偵測

- `GET /api/v1/sync/?since=cursor` 取得的 `changes[]` 逐筆呼叫 `applyServerChange()`：
  - `op="remove"` → 本地對應記錄若存在則設 `deleted=true`（tombstone 勝出），因為是軟刪除，原欄位仍保留，**可從垃圾桶還原**，符合「刪除衝突 tombstone 勝出但可還原」的要求。
  - `op ∈ {create, update}` 且本地不存在該筆 → 直接寫入。
  - `op ∈ {create, update}` 且本地已存在：
    - 一般資源（非 `notes`）：Last-Write-Wins，以 `change.serverUpdatedAt`（**伺服器時間**，見 §2 / §1.2.3「時鐘偏差以伺服器時間為準」）與本地 `updatedAt` 比較，伺服器較新才覆蓋，本地較新則保留（留給下一輪 push 送出）。
    - `notes`：若本地對該筆記錄仍有「尚未同步完成」的佇列項目（代表使用者在本地也改過、且改動還沒送達伺服器）且兩版內容不同 → **不覆蓋**，寫入 `sync_conflicts`（保留本地與伺服器兩版快照），由 `<SyncSection/>` 的衝突清單 + 底部抽屜（`ConflictSheet`）交使用者手動選「保留伺服器版本」／「保留我的版本」，不提供自動合併。
- `cursor` 為不透明字串，前端只原樣保存與回傳，不解析內容；每頁套用完成後立即持久化，若同一輪同步中途失敗，下次可從已成功的 cursor 繼續，不會重複套用已處理過的變更。

### 6.4 失敗顯示與重試

- 網路請求失敗（後端尚未實作時必然發生）：受影響的佇列項目標記 `failed`，UI（`<SyncSection/>` → `QueueStatus`）明確顯示「失敗 N 筆」與最近一次錯誤訊息，並提示下一次自動重試時間；不會拋出未捕捉例外、不會讓頁面白屏或卡住。
- 重試排程：指數退避，初始 5 秒、上限 5 分鐘、含隨機抖動，避免多個分頁同時重試造成請求尖峰；使用者可隨時點擊「立即同步」略過退避計時器手動重試。
- 開關關閉、切換離開本機模式、或登出（token 清除）：`isSyncEligible()` 回傳 `false`，`triggerSync()` 直接略過，不產生任何請求；佇列內容保留，供之後重新開啟時繼續處理。

### 6.5 對外介面

| 匯出 | 型別 | 說明 |
| --- | --- | --- |
| `initSync()` | `() => () => void` | App Shell 掛載一次（例如 root layout 的 `useEffect`）；非本機模式為 no-op；回傳 cleanup。 |
| `triggerSync()` | `() => Promise<void>` | 手動觸發一次 push+pull；供「立即同步」按鈕與自動排程共用，內部已去重併發呼叫。 |
| `setSyncPreference(enabled)` | `(boolean) => void` | 使用者開關同步；關閉時清除重試排程，不清空既有佇列。 |
| `isSyncEligible()` | `() => boolean` | 是否具備執行同步的前提（本機模式 + 已登入 + 已開啟）。 |
| `<SyncSection/>` | React 元件 | 設定頁掛載：開關、佇列狀態（待送出/失敗/最後同步時間）、衝突清單、「立即同步」按鈕；自行處理 Loading/Error/Empty 三態與模式判斷（非本機模式／未登入時顯示對應提示，不顯示同步 UI）。 |
