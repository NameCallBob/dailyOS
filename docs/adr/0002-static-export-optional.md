# ADR 0002：靜態匯出改為「可選建置目標」，預設維持伺服器渲染

- 狀態：已採納
- 日期：2026-07-20
- 決策者：主 Agent（Opus）

## 背景

新增「本機（local）」模式時，某個實作 agent 為了支援「把網頁下載/部署成 PWA」，
在 `next.config.mjs` 直接設定 `output: "export"` + GitHub Pages `basePath: "/dailyOS"` + `trailingSlash`。

這造成兩個回歸：
1. `next start` 無法運作（Next.js：`"next start" does not work with "output: export"`）。
2. **靜態匯出會停用 middleware**，而三模式（trial / local / auth）的路由守門正是靠 middleware。
   basePath `/dailyOS` 也被烘進 middleware matcher，使其在根路徑永不匹配。

## 決策

把靜態匯出改為**可選建置目標**，以環境變數 `STATIC_EXPORT=1` 開啟；預設（未設定）維持
**伺服器渲染 + middleware**。

- 預設：`next dev` / `next build` / `next start`，middleware 生效，相容之後的 Django 後端 auth 模式。
- 可攜靜態版：`STATIC_EXPORT=1 next build` → `out/`，可放 GitHub Pages 或打包離線；
  此模式 middleware 不執行，改由 `(app)` 版面 client-side `getMode()` 守門（對純本機資料模式等價）。

關鍵理由：**安裝為 PWA 不需要靜態匯出**——manifest + service worker 在伺服器模式下同樣可安裝/離線。
使用者的「下載成 PWA」需求由 PWA 安裝滿足，不需犧牲 middleware。

## 影響

- 三模式伺服器端守門恢復正常（已實測：trial/local→200；auth 無 token→307 /login；無模式/非法→307 /）。
- 需清除舊的 `.next` 與 `out/` 快取後重建，效果才會生效。
- 靜態匯出版若要保留三模式守門，需依賴 client-side 守衛（已有 `AutoRedirect`，未來可擴及 `(app)`）。
