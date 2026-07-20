import { cn } from "@/lib/cn";
import { formatDisplayDate, formatWeekday } from "../date";
import type { TrendPoint } from "../stats";

export interface TrendBarProps {
  trend: TrendPoint[];
  className?: string;
}

/** 近 7 天趨勢：非排程日以淡點顯示、排程未達標為空心、達標為實心，不使用警示色。 */
export function TrendBar({ trend, className }: TrendBarProps) {
  const summary = trend
    .map((p) => `${formatDisplayDate(p.date)}${p.scheduled ? (p.done ? " 已達標" : " 未達標") : " 非排程日"}`)
    .join("、");

  return (
    <div className={cn("flex items-end gap-1.5", className)}>
      <span className="sr-only">近 7 天趨勢：{summary}</span>
      {trend.map((point) => (
        <div key={point.date} className="flex flex-col items-center gap-1" aria-hidden>
          <div
            title={`${formatWeekday(point.date)} ${formatDisplayDate(point.date)}${
              point.scheduled ? (point.done ? "・已達標" : "・未達標") : "・非排程日"
            }`}
            className={cn(
              "h-6 w-3 rounded-full border",
              !point.scheduled && "border-line bg-transparent opacity-40",
              point.scheduled && point.done && "border-success bg-success",
              point.scheduled && !point.done && "border-line-strong bg-transparent",
            )}
          />
          <span className="text-[0.6rem] text-ink-faint">{formatDisplayDate(point.date).split("/")[1]}</span>
        </div>
      ))}
    </div>
  );
}
