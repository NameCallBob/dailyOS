# DailyOS

DailyOS 是一套繁體中文、雜誌編排風格的個人生活作業系統：工作（任務／專案／日曆／專注計時）、
個人（筆記／習慣）、健康（身形／飲水／飲食／睡眠／症狀／用藥／健身／復健／健康時間線）
與系統設定，整合在同一套 UI 之下。

產品刻意提供**「試用」與「登入」雙模式同時可用**：不需要註冊就能完整體驗所有功能（資料存在瀏覽器本機），
準備好長期使用時再登入帳號、資料改存到雲端，畫面與操作方式完全一致，只是資料來源不同。

---

## 雙模式說明

| 模式 | 觸發 | 資料存放位置 | 需要網路／帳號 | 跨裝置同步 |
| --- | --- | --- | --- | --- |
| 試用 Trial | 落地頁選「試用」 | 瀏覽器內 Dexie（IndexedDB） | 否，完全前端運作 | 否，僅限單一瀏覽器 |
| 登入 Auth | 落地頁選「登入」／註冊 | 後端資料庫（REST API） | 是 | 是（多裝置同一帳號） |

- 目前使用哪個模式記錄在 cookie `daios_mode`（`"trial"` \| `"auth"`），登入模式另有 token cookie `daios_token`。
- **UI 與元件程式碼完全共用**：唯一差異在資料存取層 `frontend/src/lib/resource.ts` 依模式切換 Dexie 或 HTTP transport，畫面完全不知道也不需要知道目前是哪個模式。
- 試用模式首次讀取任一資料表時，若本機尚無資料會自動帶入一組種子資料（lazy seed），方便立即體驗完整情境。
- 試用資料**僅存在該瀏覽器**，換裝置、換瀏覽器、清除瀏覽器資料皆會遺失；若要保留資料請改用登入模式（目前尚未提供「試用資料一鍵匯入登入帳號」功能，見下方「已知限制」）。
- 兩種模式的切換／登出邏輯集中在 `frontend/src/lib/mode.ts`；路由守門在 `frontend/src/middleware.ts`（未設定模式時導回落地頁；`auth` 模式但無 token 時導向 `/login`）。

---

## 啟動方式

```bash
cd frontend
npm install
npm run dev
```

預設於 `http://localhost:3000` 啟動。開發時無需啟動後端即可完整使用「試用模式」；若要測試「登入模式」，需另外設定環境變數 `NEXT_PUBLIC_API_BASE`（指向後端 API base URL）並啟動對應後端服務（見下方「後端待實作」）。

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
| 本機資料庫（試用模式） | dexie + dexie-react-hooks（IndexedDB 封裝） |
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
      middleware.ts                         # 依 daios_mode / daios_token 導流
      app/
        layout.tsx  globals.css
        (marketing)/page.tsx                # 落地頁：選「試用」或「登入」
        (marketing)/login/page.tsx          # 登入表單（auth 模式）
        (app)/layout.tsx                    # App Shell：桌面側欄 / 手機底部導覽 / 頂部 Quick Add + 模式徽章
        (app)/<module>/page.tsx             # 每個模組一頁（tasks / calendar / focus / notes / habits /
                                             #  body / nutrition / sleep / symptoms / meds / workouts /
                                             #  rehab / timeline / settings / dashboard …）
      lib/
        mode.ts        # getMode()/setMode()/isTrial()/isAuth()（cookie 讀寫）
        db.ts           # Dexie DB「DaiOSDB」，宣告所有資料表
        http.ts          # fetch client；base=NEXT_PUBLIC_API_BASE；bearer=daios_token；
                         # snake_case⇄camelCase 轉換；標準錯誤格式
        resource.ts      # createResource<T>()：依模式回傳 Dexie 或 HTTP 實作 + react-query hooks + lazy seed
        types.ts         # BaseRecord 等共用型別
        nav.ts           # 導覽註冊表（所有模組，繁中 label、icon、path、group）
        query.ts         # QueryClient provider
      components/ui/     # 設計系統原子元件（Button/Input/Card/Sheet/Dialog/EmptyState/ErrorState/Spinner/…）
      features/<module>/ # 各模組自有元件、zod schema、seed、業務邏輯（唯一的 createResource 呼叫處）
  backend/                # 後端服務（依 docs/api-design.md 待實作，見下方）
  docs/
    architecture.md        # 架構契約（Single Source of Truth，供所有 Agent 遵守）
    api-design.md          # REST API 逐端點規格（後端實作依據）
    openapi.yaml            # 對應的 OpenAPI 3.1 規格
    offline-sync.md          # 試用／登入雙模式資料流、同步欄位、衝突策略
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

- **試用資料不跨裝置、不可還原**：僅存於單一瀏覽器的 IndexedDB；清除瀏覽器資料或換瀏覽器即遺失，目前沒有「匯出後匯入登入帳號」的一鍵整合流程（`docs/offline-sync.md` §2.1 已預留 `id` 相容設計，供未來實作）。
- **登入模式沒有離線佇列**：斷網時的操作會直接失敗並顯示錯誤 toast，不會自動排隊等連線恢復後重送（見 `docs/offline-sync.md` §4）。
- **`version` 欄位目前非強制併發鎖**：一般資源採「後寫入者覆蓋」，尚未實作 409 樂觀鎖機制；僅筆記模組（`notes`）在規格上要求寫入前快照＋衝突偵測，但前端串接（409 偵測、`baseVersion` 傳遞）尚未完成，仍需後端與前端協作補齊。
- **健康/醫療類模組刻意不提供判斷邏輯**：症狀（symptoms）不做自動診斷或風險評分；用藥（meds）不判斷安全性、不自動調整劑量、不提供交互作用結論；復健（rehab）系統不會自動調高強度或建議加量。這些邊界寫在對應 zod schema 檔頭部註解中，後端實作時不得新增相關欄位或端點。
- **附件／檔案儲存**：健康文件（`health_documents`）、飲食照片（`meal_logs.photo`）、症狀照片（`symptom_logs.photo`）在試用模式以 data URL 直接存進 IndexedDB；登入模式後端應改為物件儲存（例如 S3／GCS）並回傳 URL，而非直接接受巨大 base64 字串內嵌在 JSON 中（`docs/api-design.md` 對應欄位已註記此建議）。
- **後端目前尚未實作**：`backend/` 目錄僅有專案骨架（`config/`、`apps/`），尚無任何 API 程式碼；`NEXT_PUBLIC_API_BASE` 未設定時，登入模式所有請求會失敗。

---

## 後端待實作

完整、逐端點的後端實作規格見：

- **`docs/api-design.md`** — 34 個資源的 REST 端點（list/create/retrieve/update/delete + 查詢參數）、14 個自訂 action、每個資源的請求／回應 JSON 欄位形狀（對齊前端 zod schema）、標準錯誤格式、auth 端點、帳號層級端點（匯出／清除資料）。**共 189 個 API 端點**，這是後端實作唯一且完整的依據，目的是讓後端可以不需要再與前端另行討論即可零落差串接。
- **`docs/openapi.yaml`** — 對應的 OpenAPI 3.1 規格，含所有 component schemas（依 zod schema 欄位逐一對應），可直接匯入 Swagger/Postman 等工具或用於程式碼產生。
- **`docs/offline-sync.md`** — 試用（Dexie）與登入（REST）雙模式資料流、同步欄位（`id`/`version`/`updatedAt`/`deleted`）語意、衝突策略（一般資源 Server-wins、高頻小顆粒資源 LWW、筆記類資源禁止無聲覆蓋須手動合併）。

後端技術選型不受前端限制，唯一硬性要求是：回應 JSON 使用 snake_case、分頁採 `{ results, count, next, previous }`、錯誤格式為 `{ code, message, field_errors?, request_id? }`、每筆記錄含 `id/created_at/updated_at/version/deleted`（詳見 `docs/api-design.md` 第 0 節全域規則）。

---

## 架構契約

所有模組／功能的建置皆須遵守 `docs/architecture.md`（Single Source of Truth）：技術棧、目錄結構、Repo 契約、設計系統、狀態與表單規範、Agent 隔離規則。
