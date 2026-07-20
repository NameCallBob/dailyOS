/**
 * features/reminders/hooks.ts — React hooks：能力偵測、權限請求、即將到來的提醒預覽。
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "@/components/ui/toast";

import { detectReminderCapabilities } from "./capabilities";
import { collectUpcomingReminders } from "./scheduler";
import { requestNotificationPermission, sendTestNotification } from "./notify";
import { useRemindersUiStore } from "./store";
import type { ReminderItem } from "./types";

/** 偵測並快取目前瀏覽器的提醒能力；requestPermission 只在使用者點擊時才會呼叫。 */
export function useReminderCapabilities() {
  const capabilities = useRemindersUiStore((s) => s.capabilities);
  const capabilitiesLoaded = useRemindersUiStore((s) => s.capabilitiesLoaded);
  const setCapabilities = useRemindersUiStore((s) => s.setCapabilities);
  const requestingPermission = useRemindersUiStore((s) => s.requestingPermission);
  const setRequestingPermission = useRemindersUiStore((s) => s.setRequestingPermission);

  const refresh = useCallback(async () => {
    const next = await detectReminderCapabilities();
    setCapabilities(next);
    return next;
  }, [setCapabilities]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 使用者主動點擊「開啟提醒」時呼叫；只有這裡會觸發瀏覽器的權限請求彈窗。 */
  const requestPermission = useCallback(async () => {
    setRequestingPermission(true);
    try {
      const result = await requestNotificationPermission();
      if (result === "unsupported") {
        toast.error("此瀏覽器不支援通知功能。");
      } else if (result === "denied") {
        toast.error("通知權限已被拒絕，請至瀏覽器設定手動開啟。");
      } else if (result === "granted") {
        toast.success("提醒已開啟。");
      }
      await refresh();
    } finally {
      setRequestingPermission(false);
    }
  }, [refresh, setRequestingPermission]);

  return { capabilities, capabilitiesLoaded, requestingPermission, requestPermission, refresh };
}

/** 「測試通知」按鈕邏輯。 */
export function useTestNotification() {
  const sendingTest = useRemindersUiStore((s) => s.sendingTest);
  const setSendingTest = useRemindersUiStore((s) => s.setSendingTest);

  const send = useCallback(async () => {
    setSendingTest(true);
    try {
      const ok = await sendTestNotification();
      if (ok) {
        toast.success("已送出測試通知。");
      } else {
        toast.error("尚未取得通知權限，請先點擊「開啟提醒」。");
      }
    } finally {
      setSendingTest(false);
    }
  }, [setSendingTest]);

  return { sendingTest, send };
}

export interface UseUpcomingRemindersResult {
  items: ReminderItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | undefined;
  refetch: () => void;
}

/** 未來 N 小時內即將提醒的項目，供設定頁預覽清單使用（非發送邏輯本身）。 */
export function useUpcomingReminders(hoursAhead = 72): UseUpcomingRemindersResult {
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setIsError(false);
      try {
        const now = new Date();
        const result = await collectUpcomingReminders({ from: now, to: new Date(now.getTime() + hoursAhead * 3_600_000) });
        if (cancelled) return;
        setItems(result);
      } catch (err) {
        if (cancelled) return;
        setIsError(true);
        setErrorMessage(err instanceof Error ? err.message : "讀取即將提醒的項目失敗。");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [hoursAhead, reloadToken]);

  return { items, isLoading, isError, errorMessage, refetch: () => setReloadToken((t) => t + 1) };
}
