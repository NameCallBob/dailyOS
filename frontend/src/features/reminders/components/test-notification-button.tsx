"use client";

import { Button } from "@/components/ui/button";

import { useReminderCapabilities, useTestNotification } from "../hooks";

/** 送出一則立即通知，驗證目前瀏覽器/權限設定是否真的能收到提醒。 */
export function TestNotificationButton() {
  const { capabilities } = useReminderCapabilities();
  const { sendingTest, send } = useTestNotification();

  const disabled = !capabilities.notificationSupported || capabilities.permission !== "granted";

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="secondary" size="sm" onClick={() => void send()} loading={sendingTest} disabled={disabled}>
        發送測試通知
      </Button>
      {disabled ? <p className="text-caption text-ink-muted">請先開啟提醒權限，才能發送測試通知。</p> : null}
    </div>
  );
}
