/**
 * lib/query.ts — react-query QueryClient 與 Provider。
 * 實際 Provider 元件在 components/providers/query-provider.tsx（需要 "use client"），
 * 這裡只放建立 QueryClient 的工廠函式，供 provider 與測試共用。
 */

import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 目前作用中的 QueryClient（供 lib/resource.ts 在「非 hook」情境下使用）。
// ---------------------------------------------------------------------------
//
// 部分模組的 mutation 直接呼叫 repo 的原始方法（`repo.create()` / `repo.update()` /
// `repo.remove()`），而非 `repo.useCreate()` 等 hook 版本 —— 原始方法本身不在 React
// render 階段執行、拿不到 `useQueryClient()`。若完全不處理，這類呼叫寫入 Dexie 後
// react-query 的清單快取（staleTime 30 秒）不會失效，畫面要等到 staleTime 過期或
// 整頁重新整理才會顯示剛新增/更新的資料，形成「明明存進去了、畫面卻看不到」的錯覺。
// 這裡讓 QueryProvider 掛載時登記目前的 client，resource.ts 的原始方法在寫入成功後
// 一併呼叫 invalidateQueries，讓兩種呼叫方式都能保持畫面與資料一致。
let activeQueryClient: QueryClient | null = null;

export function setActiveQueryClient(client: QueryClient | null): void {
  activeQueryClient = client;
}

export function getActiveQueryClient(): QueryClient | null {
  return activeQueryClient;
}
