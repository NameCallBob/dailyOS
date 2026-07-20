"use client";

/**
 * water-bar-chart.tsx — 每日飲水量長條圖（含目標線）。
 * 灰色（淡）長條代表當日「無紀錄」，非「飲水量為 0」，避免誤導使用者。
 */

import { useMemo } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ChartCaption } from "./chart-caption";
import { formatDateShort, formatInt } from "../utils";

export interface WaterBarChartDay {
  date: string;
  totalMl: number;
  hasLog: boolean;
}

export interface WaterBarChartProps {
  days: WaterBarChartDay[];
  goalMl: number;
}

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = { top: 20, right: 16, bottom: 26, left: 44 };

export function WaterBarChart({ days, goalMl }: WaterBarChartProps) {
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const { bars, goalY, maxLabel } = useMemo(() => {
    const values = days.map((d) => d.totalMl);
    const max = Math.max(goalMl, ...values, 1);
    const n = days.length || 1;
    const barW = innerW / n;
    const yFor = (v: number) => PADDING.top + innerH - (v / max) * innerH;
    const barList = days.map((d, i) => {
      const x = PADDING.left + i * barW + barW * 0.15;
      const w = barW * 0.7;
      const y = yFor(d.totalMl);
      const h = PADDING.top + innerH - y;
      return { ...d, x, w, y, h };
    });
    return { bars: barList, goalY: yFor(goalMl), maxLabel: formatInt(max) };
  }, [days, goalMl, innerW, innerH]);

  if (days.length === 0) {
    return <EmptyState title="尚無飲水資料" description="開始記錄飲水後即可顯示每日趨勢。" />;
  }

  const missingCount = days.filter((d) => !d.hasLog).length;
  const firstDate = days[0]?.date;
  const lastDate = days[days.length - 1]?.date;

  return (
    <div>
      <svg
        role="img"
        aria-label={`每日飲水量長條圖，單位毫升，共 ${days.length} 天，其中 ${missingCount} 天無紀錄`}
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
          {maxLabel}
        </text>
        <text x={4} y={HEIGHT - PADDING.bottom} className="fill-ink-muted text-[10px]">
          0
        </text>

        {/* 目標線 */}
        <line
          x1={PADDING.left}
          y1={goalY}
          x2={WIDTH - PADDING.right}
          y2={goalY}
          className="stroke-accent"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
        <text x={WIDTH - PADDING.right} y={goalY - 4} textAnchor="end" className="fill-accent text-[10px]">
          目標 {formatInt(goalMl)} mL
        </text>

        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={bar.hasLog ? bar.y : HEIGHT - PADDING.bottom - 3}
            width={bar.w}
            height={bar.hasLog ? Math.max(bar.h, 1) : 3}
            rx={2}
            className={bar.hasLog ? (bar.totalMl >= goalMl ? "fill-success" : "fill-ink") : "fill-line-strong"}
          >
            <title>
              {bar.date}：{bar.hasLog ? `${formatInt(bar.totalMl)} 毫升` : "當日無紀錄"}
            </title>
          </rect>
        ))}

        {firstDate ? (
          <text x={PADDING.left} y={HEIGHT - 6} className="fill-ink-muted text-[10px]">
            {formatDateShort(firstDate)}
          </text>
        ) : null}
        {lastDate ? (
          <text x={WIDTH - PADDING.right} y={HEIGHT - 6} textAnchor="end" className="fill-ink-muted text-[10px]">
            {formatDateShort(lastDate)}
          </text>
        ) : null}
      </svg>
      <ChartCaption
        unit="毫升 (mL)"
        rangeFromIso={firstDate}
        rangeToIso={lastDate}
        gapCount={missingCount}
        allManual
        pointCount={days.length}
      />
      {missingCount > 0 ? (
        <p className="mt-2 text-caption text-ink-muted">
          淺灰長條表示當日尚無飲水紀錄，並非實際飲水量為 0。
        </p>
      ) : null}
    </div>
  );
}
