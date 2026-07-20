/**
 * features/settings/hooks.ts — singleton 資源存取封裝。
 *
 * user_profile / user_preferences / notification_prefs 皆只會有一筆現行紀錄，
 * 但 repo 契約以清單／分頁為主。useSingletonResource() 負責：
 * - 用 list(pageSize=1) 取得目前唯一一筆。
 * - 若清單為空（例如登入模式的全新帳號），自動建立一筆預設值，避免畫面卡在空狀態。
 * - 統一暴露 loading / error / record / update mutation，供設定頁 / Onboarding 共用。
 */

"use client";

import { useEffect, useRef } from "react";

import type { Repo } from "@/lib/resource";
import type { BaseRecord } from "@/lib/types";

export interface UseSingletonResourceResult<T extends BaseRecord> {
  record: T | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | undefined;
  refetch: () => void;
  save: (patch: Partial<T>) => void;
  isSaving: boolean;
}

export function useSingletonResource<T extends BaseRecord>(
  repo: Repo<T>,
  buildDefaults: () => Partial<T>,
): UseSingletonResourceResult<T> {
  const listQuery = repo.useList({ pageSize: 1 });
  const createMutation = repo.useCreate();
  const updateMutation = repo.useUpdate();
  const triggeredRef = useRef(false);

  const record = listQuery.data?.results[0];

  useEffect(() => {
    if (listQuery.status !== "success") return;
    if (record) {
      triggeredRef.current = false;
      return;
    }
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    createMutation.mutate(buildDefaults());
    // buildDefaults 由呼叫端提供固定內容，僅需在清單狀態改變時重新評估是否需要建立。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQuery.status, record]);

  function save(patch: Partial<T>) {
    if (!record) return;
    updateMutation.mutate({ id: record.id, patch });
  }

  return {
    record,
    isLoading: listQuery.isLoading || (listQuery.status === "success" && !record),
    isError: listQuery.isError,
    errorMessage: listQuery.error?.message,
    refetch: () => void listQuery.refetch(),
    save,
    isSaving: updateMutation.isPending || createMutation.isPending,
  };
}
