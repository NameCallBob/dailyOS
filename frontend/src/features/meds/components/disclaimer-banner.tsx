/**
 * features/meds/components/disclaimer-banner.tsx — 安全邊界聲明。
 * 固定顯示於用藥模組頁面頂部，明確告知系統的能力邊界。
 */
export function DisclaimerBanner() {
  return (
    <div role="note" className="rounded-lg border border-line-strong bg-paper-sunken px-4 py-3 text-caption text-ink-soft">
      <p>
        <strong className="text-ink">僅供個人記錄與提醒。</strong>
        本工具不判斷用藥安全性、不自動調整劑量、也不提供藥物交互作用的結論。若對用藥有任何疑問，請諮詢醫師或藥師。
      </p>
    </div>
  );
}
