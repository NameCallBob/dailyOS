"use client";

/** weekly-time-chart.tsx — 每週運動時間長條圖（近 8 週）。 */

import { useMemo } from "react";

import { EmptyState } from "@/components/ui/empty-state";

import type { WeeklyStat } from "../utils";
import { formatDateShort, formatInt } from "../utils";

export interface WeeklyTimeChartProps {
  weeks: WeeklyStat[];
}

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = { top: 20, right: 16, bottom: 26, left: 44 };

export function WeeklyTimeChart({ weeks }: WeeklyTimeChartProps) {
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const { bars, maxLabel } = useMemo(() => {
    const values = weeks.map((w) => w.totalMinutes);
    const max = Math.max(...values, 60);
    const n = weeks.length || 1;
    const barW = innerW / n;
    const yFor = (v: number) => PADDING.top + innerH - (v / max) * innerH;
    const barList = weeks.map((w, i) => {
      const x = PADDING.left + i * barW + barW * 0.15;
      const w2 = barW * 0.7;
      const y = yFor(w.totalMinutes);
      const h = PADDING.top + innerH - y;
      return { ...w, x, w: w2, y, h };
    });
    return { bars: barList, maxLabel: formatInt(max) };
  }, [weeks, innerW, innerH]);

  if (weeks.length === 0) {
    return <EmptyState title="尚無訓練資料" description="開始記錄訓練後即可顯示每週運動時間趨勢。" />;
  }

  const firstWeek = weeks[0]?.weekStart;
  const lastWeek = weeks[weeks.length - 1]?.weekStart;

  return (
    <svg
      role="img"
      aria-label={`每週運動時間長條圖，單位分鐘，共 ${weeks.length} 週`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={HEIGHT - PADDING.bottom} className="stroke-line" strokeWidth={1} />
      <line
        x1={PADDING.left}
        y1={HEIGHT - PADDING.bottom}
        x2={WIDTH - PADDING.right}
        y2={HEIGHT - PADDING.bottom}
        className="stroke-line"
        strokeWidth={1}
      />
      <text x={4} y={PADDING.top + 4} className="fill-ink-muted text-[10px]">
        {maxLabel} 分
      </text>
      <text x={4} y={HEIGHT - PADDING.bottom} className="fill-ink-muted text-[10px]">
        0
      </text>

      {bars.map((bar, idx) => (
        <rect key={idx} x={bar.x} y={bar.y} width={bar.w} height={Math.max(bar.h, 1)} rx={2} className="fill-ink">
          <title>
            {formatDateShort(bar.weekStart)} 起：{formatInt(bar.totalMinutes)} 分鐘，{bar.workoutCount} 次訓練
          </title>
        </rect>
      ))}

      {firstWeek ? (
        <text x={PADDING.left} y={HEIGHT - 6} className="fill-ink-muted text-[10px]">
          {formatDateShort(firstWeek)}
        </text>
      ) : null}
      {lastWeek ? (
        <text x={WIDTH - PADDING.right} y={HEIGHT - 6} textAnchor="end" className="fill-ink-muted text-[10px]">
          {formatDateShort(lastWeek)}
        </text>
      ) : null}
    </svg>
  );
}
