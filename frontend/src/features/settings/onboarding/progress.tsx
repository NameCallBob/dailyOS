import { cn } from "@/lib/cn";

export interface OnboardingProgressProps {
  step: number;
  total: number;
  labels: string[];
}

/** 步驟指示：非純顏色，同時以文字與圓點形狀傳達目前進度（符合 WCAG）。 */
export function OnboardingProgress({ step, total, labels }: OnboardingProgressProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label uppercase text-ink-muted">
        第 {step + 1} / {total} 步 · {labels[step]}
      </p>
      <ol className="flex items-center gap-2" aria-label="導覽進度">
        {labels.map((label, index) => {
          const state = index < step ? "done" : index === step ? "current" : "upcoming";
          return (
            <li key={label} className="flex-1">
              <span
                aria-current={state === "current" ? "step" : undefined}
                aria-label={`${label}：${state === "done" ? "已完成" : state === "current" ? "目前步驟" : "尚未開始"}`}
                className={cn(
                  "block h-1.5 w-full rounded-full transition-colors",
                  state === "done" && "bg-ink",
                  state === "current" && "bg-ink/60",
                  state === "upcoming" && "bg-line-strong",
                )}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
