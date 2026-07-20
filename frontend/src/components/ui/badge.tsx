import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-paper-sunken text-ink-soft border-line-strong",
  accent: "bg-accent-soft text-accent border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

/** 狀態指示符號（非純顏色）：實心圓 / 空心圓 / 三角形 / 方形，搭配文字。 */
const toneGlyph: Record<BadgeTone, string> = {
  neutral: "●",
  accent: "◆",
  success: "●",
  warning: "▲",
  danger: "■",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  withGlyph?: boolean;
}

export function Badge({ className, tone = "neutral", withGlyph = true, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-label",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {withGlyph ? <span aria-hidden className="text-[0.55rem]">{toneGlyph[tone]}</span> : null}
      {children}
    </span>
  );
}
