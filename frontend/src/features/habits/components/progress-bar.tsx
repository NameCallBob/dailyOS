import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  ratio: number;
  label: string;
  tone?: "accent" | "success";
  className?: string;
}

/** 非懲罰性的進度條：未達標時維持中性色，只有達標才轉為 success，不使用紅色警示。 */
export function ProgressBar({ ratio, label, tone = "accent", className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const percent = Math.round(clamped * 100);
  const filled = clamped >= 1;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-paper-sunken", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
          filled ? "bg-success" : tone === "success" ? "bg-success" : "bg-accent",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
