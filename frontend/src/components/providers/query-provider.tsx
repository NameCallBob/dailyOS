"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { createQueryClient, setActiveQueryClient } from "@/lib/query";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createQueryClient());

  // 登記目前作用中的 QueryClient，供 lib/resource.ts 在非 hook 情境（直接呼叫
  // repo.create()/update()/remove() 而非 useCreate() 等 mutation hook）下也能讓
  // 寫入後的快取失效，避免畫面停留在寫入前的舊資料。見 lib/query.ts 註解。
  useEffect(() => {
    setActiveQueryClient(client);
    return () => setActiveQueryClient(null);
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
