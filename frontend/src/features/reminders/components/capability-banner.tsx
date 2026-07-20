"use client";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useReminderCapabilities } from "../hooks";
import type { ReminderCapabilities } from "../types";

function permissionLabel(capabilities: ReminderCapabilities): { label: string; tone: BadgeTone } {
  if (!capabilities.notificationSupported) return { label: "此瀏覽器不支援通知", tone: "neutral" };
  switch (capabilities.permission) {
    case "granted":
      return { label: "通知權限：已開啟", tone: "success" };
    case "denied":
      return { label: "通知權限：已拒絕", tone: "danger" };
    default:
      return { label: "通知權限：尚未設定", tone: "warning" };
  }
}

/**
 * 誠實呈現「此瀏覽器可否在 App 完全關閉後提醒」的真實狀態，並提供「開啟提醒」按鈕。
 * requestPermission 只會在使用者點擊此按鈕時觸發，不會自動彈出權限請求。
 */
export function CapabilityBanner() {
  const { capabilities, capabilitiesLoaded, requestingPermission, requestPermission } = useReminderCapabilities();

  if (!capabilitiesLoaded) {
    return (
      <div className="rounded-lg border border-line bg-paper-sunken p-4">
        <p className="text-caption text-ink-muted">正在偵測此瀏覽器的通知能力…</p>
      </div>
    );
  }

  const { label, tone } = permissionLabel(capabilities);
  const canRequest = capabilities.notificationSupported && capabilities.permission === "default";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-paper-sunken p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{label}</Badge>
          <Badge tone={capabilities.canRemindWhenClosed ? "success" : "warning"}>
            {capabilities.canRemindWhenClosed ? "App 關閉後仍可能提醒" : "App 關閉後不會提醒"}
          </Badge>
        </div>
        {canRequest ? (
          <Button type="button" size="sm" onClick={() => void requestPermission()} loading={requestingPermission}>
            開啟提醒
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 text-caption text-ink-muted">
        <p>
          App 開啟中：所有主流瀏覽器都能可靠地跳出提醒（本頁會定期在背景掃描到期的任務、習慣、用藥、
          飲水與回診提醒）。
        </p>
        <p>
          App 完全關閉後：{capabilities.isSafari
            ? "Safari 不支援「離線預約通知」，關閉 App 後不會收到本機提醒；若需要關閉後仍收到通知，請於「模式」切換為登入雲端，由伺服器透過 Web Push 發送。"
            : capabilities.supportsTriggers
              ? "此瀏覽器（Chrome / Edge 等 Chromium 系）支援預約通知，會盡力在關閉 App 後準時提醒；但仍可能受作業系統省電機制影響而延遲或未送達，並非 100% 保證。"
              : "此瀏覽器不支援預約通知，關閉 App 後不會收到提醒，需等下次開啟 App 時由本頁補上錯過的提醒。"}
        </p>
        {!capabilities.serviceWorkerReady ? (
          <p>尚未偵測到已就緒的 Service Worker，部分通知功能（含背景預約）可能無法使用；重新整理頁面或稍候片刻通常會自動就緒。</p>
        ) : null}
        {capabilities.permission === "denied" ? (
          <p>通知已被封鎖，請至瀏覽器的網站設定中手動允許通知後，重新整理本頁。</p>
        ) : null}
      </div>
    </div>
  );
}
