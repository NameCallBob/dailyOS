import { cn } from "@/lib/cn";
import { URGENT_CARE_MESSAGE } from "../utils";

export interface UrgentCareBannerProps {
  className?: string;
}

/**
 * 保守就醫提醒——固定文案，不推測病名、不做診斷，僅提示使用者自行評估是否諮詢醫療專業人員。
 * 不得因觸發此提醒而阻擋使用者送出或編輯紀錄。
 */
export function UrgentCareBanner({ className }: UrgentCareBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-md border border-warning bg-warning-soft px-3.5 py-3 text-caption text-ink",
        className,
      )}
    >
      <span aria-hidden className="mt-0.5 text-warning">
        ▲
      </span>
      <p>{URGENT_CARE_MESSAGE}</p>
    </div>
  );
}
