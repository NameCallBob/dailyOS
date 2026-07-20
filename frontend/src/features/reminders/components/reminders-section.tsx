"use client";

import { NotificationForm } from "@/features/settings/components/notification-form";

import { CapabilityBanner } from "./capability-banner";
import { TestNotificationButton } from "./test-notification-button";
import { UpcomingList } from "./upcoming-list";

/**
 * 本機提醒設定區塊：權限狀態與平台能力誠實說明、各類型開關與安靜時段（沿用
 * features/settings 既有的 notification_prefs 表單，避免重複實作同一份偏好）、
 * 測試通知按鈕、以及即將提醒項目的預覽清單。
 *
 * 供設定頁（或任何頁面）直接嵌入：<RemindersSection />。
 */
export function RemindersSection() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-label uppercase text-ink-muted">通知能力與權限</h3>
        <CapabilityBanner />
        <TestNotificationButton />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-label uppercase text-ink-muted">提醒類型與安靜時段</h3>
        <NotificationForm />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-label uppercase text-ink-muted">即將提醒（未來 3 天）</h3>
        <UpcomingList />
      </section>
    </div>
  );
}
