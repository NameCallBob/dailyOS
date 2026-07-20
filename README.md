# DailyOS

DailyOS 是一套繁體中文、雜誌編排風格的個人生活作業系統：工作（任務／專案／日曆／專注計時）、
個人（筆記／習慣）、健康（身形／飲水／飲食／睡眠／症狀／用藥／健身／復健／健康時間線）
與系統設定，整合在同一套 UI 之下。

產品刻意提供**「試用 / 本機 / 雲端」三種模式同時可用**：不需要註冊就能完整體驗所有功能（資料存在瀏覽器本機），
想長期把它當成私人本機工具可直接留在本機模式（可安裝為 PWA、開啟本機提醒、JSON 匯出/匯入），
準備好跨裝置使用時再登入帳號、資料改存到雲端，畫面與操作方式完全一致，只是資料來源不同。

---

## 三種模式說明

| 模式 | 觸發 | 資料存放位置 | 需要網路／帳號 | 跨裝置同步 | 特色能力 |
| --- | --- | --- | --- | --- | --- |
| 試用 Trial | 落地頁選「開始試用」 | 瀏覽器內 Dexie（IndexedDB，`DaiOSDB_trial`）+ demo 種子資料 | 否，完全前端運作 | 否，僅限單一瀏覽器 | 可隨時一鍵重置示範資料 |
| 本機 Local | 落地頁選「以本機開始」 | 瀏覽器內 Dexie（IndexedDB，`DaiOSDB`，與 trial 完全獨立） | 否，完全前端運作 | 否（除非登入後另外開啟雲端同步） | 可安裝為 PWA、本機提醒（App 開啟中可靠）、JSON 匯出/匯入跨電腦、登入後可選擇開啟雲端同步 |
| 雲端 Auth | 落地頁選「登入 / 註冊」 | 後端資料庫（REST API） | 是 | 是（多裝置同一帳號） | 後端負責跨裝置同步與（未來）背景推播提醒 |

- 目前使用哪個模式記錄在 cookie `daios_mode`（`"trial"` \| `"local"` \| `"auth"`），登入模式另有 token cookie `daios_token`。
- **UI 與元件程式碼完全共用**：唯一差異在資料存取層 `frontend/src/lib/resource.ts` 依模式切換 Dexie 或 HTTP transport，畫面完全不知道也不需要知道目前是哪個模式；`isLocalData()` / `usesDexie()` 統一判斷「trial 或 local」這兩種走 Dexie 的模式。
- **trial 與 local 使用兩個完全獨立的 IndexedDB**（`frontend/src/lib/db.ts` 的 `DB_NAME_TRIAL` / `DB_NAME_LOCAL`），互不污染：試用模式的假 demo 資料不會出現在本機模式，反之亦然。
- 只有**試用模式**首次讀取任一資料表時，若本機尚無資料會自動帶入一組種子資料（lazy seed），方便立即體驗完整情境；**本機模式起始一律為空**，不會載入任何 demo 資料。
- 試用資料**僅存在該瀏覽器**，換裝置、換瀏覽器、清除瀏覽器資料皆會遺失，且無法保留（本來就是可拋棄的示範資料，可在「設定 → 模式」隨時重置）。本機模式的資料同樣只存在該瀏覽器，但屬於使用者真實資料，可在「設定 → 資料、提醒與同步」匯出 JSON 備份、帶到另一台電腦匯入，或登入後開啟雲端同步。
- 三種模式的切換／登出邏輯集中在 `frontend/src/lib/mode.ts`（`allModes()` 回傳全部合法模式供 UI 使用）；路由守門在 `frontend/src/middleware.ts`（未設定模式時導回落地頁；trial／local 免 token 即可進入；`auth` 模式但無 token 時導向 `/login`）。
- 在「設定 → 模式」可於三種模式間切換；切換一律整頁重新導向 `/dashboard`（或 `/login`）並在到達後顯示一次提示 toast。從本機模式的「同步」設定登入時，只會附加 token 以開啟同步，**不會**把 cookie 切成 `auth`（否則會改走 HTTP、看不到本機 Dexie 裡的真實資料）；只有從落地頁「登入 / 註冊」進入時登入成功才會切換為雲端模式。

### 本機提醒的誠實限制（務必如實呈現，不得誇大）

本機提醒（`frontend/src/features/reminders`）以 in-app 排程器 + `Notification` API 實作：

- **App 開啟中**：所有主流瀏覽器皆可靠觸發提醒。
- **App 完全關閉時**：只有 **Chromium 系（Chrome / Edge，桌面與 Android）** 透過 Notification Triggers（`showTrigger` / `TimestampTrigger`）能可靠地預約通知；**Safari（macOS 與 iOS）完全不支援** Notification Triggers，也不支援在未登入狀態下背景 Web Push。若需要「App 關閉後仍收到提醒」且使用 Safari，目前唯一路徑是登入雲端（`auth`）模式由後端排程 Web Push——但後端 Web Push 尚未實作（見「已知限制」）。
- 實際能力以 `detectReminderCapabilities()` 執行期偵測結果為準，UI（`CapabilityBanner`）直接呈現偵測到的 `canRemindWhenClosed` 等欄位，不會宣稱未偵測到的能力。

---

## 啟動方式

```bash
cd frontend
npm install
npm run dev
```

預設於 `http://localhost:3000` 啟動。開發時無需啟動後端即可完整使用「試用模式」與「本機模式」；若要測試「雲端模式」，需另外設定環境變數 `NEXT_PUBLIC_API_BASE`（指向後端 API base URL）並啟動對應後端服務（見下方「後端待實作」）。

其他指令：

```bash
npm run build       # 產生正式版建置
npm run start        # 執行已建置的正式版
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit（TypeScript strict）
npm run test:e2e     # Playwright 端對端測試
```

---

## 技術架構

| 分類 | 技術 |
| --- | --- |
| 框架 | Next.js（App Router）· TypeScript（strict） |
| 樣式 | Tailwind CSS |
| 資料狀態 | @tanstack/react-query（伺服器/非同步狀態）· zustand（本地 UI 狀態） |
| 表單／驗證 | react-hook-form + zod |
| 本機資料庫（試用／本機模式） | dexie + dexie-react-hooks（IndexedDB 封裝，trial 與 local 各自獨立資料庫） |
| 套件管理 | npm |
| E2E 測試 | Playwright |

### 資料存取的唯一入口：`createResource<T>()`

```ts
createResource<T>({ name, schema /* zod */, seed /* () => T[] */, actions? })
```

回傳一個 `Repo<T>`，提供 `list/get/create/update/remove` 與對應的 react-query hooks（`useList/useItem/useCreate/useUpdate/useRemove`），依 `daios_mode` 自動切換 Dexie 或 REST（`/api/v1/{name}/`）。所有畫面元件一律透過各模組匯出的 repo 實例存取資料，不直接碰 Dexie 或 fetch。

### 設計系統

白底黑字 + 灰階 + 單一低彩度 accent；大量留白、細線分隔、雜誌式標題、數據使用 tabular-nums。狀態不可僅靠顏色表達，符合 WCAG 2.2 AA 對比，支援 `prefers-reduced-motion`。每個清單／資料視圖皆實作 **Loading / Error / Empty / Offline** 四種狀態。介面文字一律繁體中文，程式碼識別字使用英文。

---

## 目錄結構

```
my-tools/
  frontend/
    package.json  tsconfig.json  next.config.mjs  tailwind.config.ts  postcss.config.mjs
    src/
      middleware.ts                         # 依 daios_mode / daios_token 導流（trial/local 免 token，auth 需 token）
      app/
        layout.tsx  globals.css
        (marketing)/page.tsx                # 落地頁：選「試用」／「本機」／「登入」
        (marketing)/login/page.tsx          # 登入表單（auth 模式；本機模式登入以開啟同步時也共用此頁）
        (app)/layout.tsx                    # App Shell：桌面側欄 / 手機底部導覽 / 頂部 Quick Add + 模式徽章
                                             #  掛載時呼叫 initReminders() / initSync()（各自依模式自我判斷是否生效）
        (app)/<module>/page.tsx             # 每個模組一頁（tasks / calendar / focus / notes / habits /
                                             #  body / nutrition / sleep / symptoms / meds / workouts /
                                             #  rehab / timeline / settings / dashboard …）
      lib/
        mode.ts        # DaiosMode = "trial"|"local"|"auth"；getMode()/setMode()/isTrial()/isLocal()/isAuth()/
                         # isLocalData()/usesDexie()/allModes()/getToken()/setToken()（cookie 讀寫）
        db.ts           # Dexie：DB_NAME_TRIAL（DaiOSDB_trial）與 DB_NAME_LOCAL（DaiOSDB）兩個獨立資料庫，
                         # 34 張資料表；getDb() 依目前模式選擇
        http.ts          # fetch client；base=NEXT_PUBLIC_API_BASE；bearer=daios_token；
                         # snake_case⇄camelCase 轉換；標準錯誤格式
        resource.ts      # createResource<T>()：依模式回傳 Dexie 或 HTTP 實作 + react-query hooks + lazy seed
                         # （只有 trial 會 seed）+ registerLocalWriteObserver()（供 reminders/sync 訂閱本機寫入）
        types.ts         # BaseRecord 等共用型別
        nav.ts           # 導覽註冊表（所有模組，繁中 label、icon、path、group）
        query.ts         # QueryClient provider
      components/ui/     # 設計系統原子元件（Button/Input/Card/Sheet/Dialog/EmptyState/ErrorState/Spinner/…）
      components/pwa/    # Service Worker 註冊、beforeinstallprompt 安裝提示（InstallButton / useInstallPrompt）
      features/<module>/ # 各模組自有元件、zod schema、seed、業務邏輯（唯一的 createResource 呼叫處）
      features/data-transfer/  # 本機模式的 JSON 匯出/匯入（<DataTransferSection/>）
      features/reminders/      # 本機提醒排程器（initReminders()、<RemindersSection/>）
      features/sync/            # 本機模式登入後的雲端同步引擎（initSync()、<SyncSection/>）
  backend/                # 後端服務（依 docs/api-design.md 待實作，見下方）
  docs/
    architecture.md        # 架構契約（Single Source of Truth，供所有 Agent 遵守）
    api-design.md          # REST API 逐端點規格（後端實作依據）
    openapi.yaml            # 對應的 OpenAPI 3.1 規格
    offline-sync.md          # 三模式資料流、同步欄位、衝突策略
```

### 資料模組總覽（34 個資源，14 個功能模組）

| 模組 | 擁有的資源 |
| --- | --- |
| tasks | tasks, projects, tags |
| calendar | calendar_events |
| focus | timer_sessions, time_entries |
| notes | notes, note_versions |
| habits | habits, habit_logs |
| body | body_metrics, water_logs |
| nutrition | meal_logs |
| sleep | sleep_logs |
| symptoms | symptom_defs, symptom_logs |
| meds | medications, medication_schedules, medication_logs, supplements |
| workouts | workouts, workout_exercises, workout_sets, exercise_defs |
| rehab | rehab_plans, rehab_exercises, rehab_sessions |
| timeline | health_documents, appointments, activities |
| settings | user_profile, user_preferences, notification_prefs |
| dashboard | dashboard_layout（另彙整讀取其他模組的資料以組成總覽） |

---

## 已知限制

- **試用資料不跨裝置、不可還原**：僅存於單一瀏覽器的 IndexedDB（`DaiOSDB_trial`）；清除瀏覽器資料或換瀏覽器即遺失，本來就是可隨時重置的示範資料，無「匯出後匯入」的必要。若要保留真正屬於自己的資料，請改用**本機模式**或**雲端模式**。
- **本機模式的資料只在單一瀏覽器**：`DaiOSDB` 僅存在目前這台裝置的這個瀏覽器設定檔（profile）裡，換瀏覽器、換裝置、清除瀏覽器資料一樣會遺失。緩解方式：①「設定 → 資料、提醒與同步」提供 JSON 匯出／匯入，可手動搬到另一台電腦；②登入帳號後可選擇開啟雲端同步（`features/sync`），把本機資料備份並跨裝置帶著走。
- **本機提醒在「App 完全關閉」時，只有 Chromium 系瀏覽器可靠**：見上方「三種模式說明」中的誠實限制段落；Safari 使用者若需要背景提醒，目前唯一路徑是登入雲端由後端 Web Push 推播——但**後端 Web Push 尚未實作**（見下方後端狀態）。
- **雲端同步是輪詢＋佇列，非即時**：`features/sync` 以固定週期輪詢 + 本機寫入佇列（`registerLocalWriteObserver`）運作，不是 WebSocket 即時同步；離線時的變更會留在佇列裡，恢復連線或使用者手動點「立即同步」後才會送出。
- **`version` 欄位目前非強制併發鎖**：一般資源採「後寫入者覆蓋」，尚未實作 409 樂觀鎖機制；僅筆記模組（`notes`）在規格上要求寫入前快照＋衝突偵測，但前端串接（409 偵測、`baseVersion` 傳遞）尚未完成，仍需後端與前端協作補齊。
- **健康/醫療類模組刻意不提供判斷邏輯**：症狀（symptoms）不做自動診斷或風險評分；用藥（meds）不判斷安全性、不自動調整劑量、不提供交互作用結論；復健（rehab）系統不會自動調高強度或建議加量。這些邊界寫在對應 zod schema 檔頭部註解中，後端實作時不得新增相關欄位或端點。
- **附件／檔案儲存**：健康文件（`health_documents`）、飲食照片（`meal_logs.photo`）、症狀照片（`symptom_logs.photo`）在試用／本機模式以 data URL 直接存進 IndexedDB；雲端模式後端應改為物件儲存（例如 S3／GCS）並回傳 URL，而非直接接受巨大 base64 字串內嵌在 JSON 中（`docs/api-design.md` 對應欄位已註記此建議）。這也表示本機模式的 JSON 備份檔案在附件較多時可能相當大。
- **後端狀態**：`backend/` 目錄已有另一位 Agent 併行開發的 Django + DRF 專案骨架與部分實作（`apps/`、`config/`），但其完整程度、是否可正確串接前端 189 個端點，**未在本次「本機模式整合驗證」範圍內逐一驗證**；`NEXT_PUBLIC_API_BASE` 未設定或後端未啟動／未完整實作時，雲端模式與本機模式的「開啟雲端同步」都會請求失敗。

---

## 後端待實作

完整、逐端點的後端實作規格見：

- **`docs/api-design.md`** — 34 個資源的 REST 端點（list/create/retrieve/update/delete + 查詢參數）、14 個自訂 action、每個資源的請求／回應 JSON 欄位形狀（對齊前端 zod schema）、標準錯誤格式、auth 端點、帳號層級端點（匯出／清除資料）。**共 189 個 API 端點**，這是後端實作唯一且完整的依據，目的是讓後端可以不需要再與前端另行討論即可零落差串接。
- **`docs/openapi.yaml`** — 對應的 OpenAPI 3.1 規格，含所有 component schemas（依 zod schema 欄位逐一對應），可直接匯入 Swagger/Postman 等工具或用於程式碼產生。
- **`docs/offline-sync.md`** — 試用／本機（Dexie）與雲端（REST）三模式資料流、同步欄位（`id`/`version`/`updatedAt`/`deleted`）語意、衝突策略（一般資源 Server-wins、高頻小顆粒資源 LWW、筆記類資源禁止無聲覆蓋須手動合併）。

後端技術選型不受前端限制，唯一硬性要求是：回應 JSON 使用 snake_case、分頁採 `{ results, count, next, previous }`、錯誤格式為 `{ code, message, field_errors?, request_id? }`、每筆記錄含 `id/created_at/updated_at/version/deleted`（詳見 `docs/api-design.md` 第 0 節全域規則）。

---

## 架構契約

所有模組／功能的建置皆須遵守 `docs/architecture.md`（Single Source of Truth）：技術棧、目錄結構、Repo 契約、設計系統、狀態與表單規範、Agent 隔離規則。
