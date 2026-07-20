"use client";

/**
 * sleep-line-chart.tsx — 通用單一數值折線圖（睡眠時數／品質趨勢共用）。
 * 缺口以虛線＋中斷標示；資料點數量於圖表下方的 ChartCaption 呈現。
 */

import { useId, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { detectDateGaps, formatDateLong, formatDateShort, formatNumber } from "../utils";

export interface SleepLineChartPoint {
  date: string;
  value: number;
}

export interface SleepLineChartProps {
  points: SleepLineChartPoint[];
  unit: string;
  label: string;
  height?: number;
  digits?: number;
  /** 提供時，於圖上以水平參考帶標示建議範圍（例如建議睡眠時數 7–9 小時） */
  referenceRange?: { min: number; max: number };
}

const WIDTH = 640;
const PADDING = { top: 20, right: 16, bottom: 26, left: 34 };

export function SleepLineChart({ points, unit, label, height = 180, digits = 1, referenceRange }: SleepLineChartProps) {
  const gradientId = useId();
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const { path, dashedSegments, dots, minLabel, maxLabel, gapCount, refBandY } = useMemo(() => {
    if (points.length === 0) {
      return {
        path: "",
        dashedSegments: [] as string[],
        dots: [] as Array<{ x: number; y: number; value: number; date: string }>,
        minLabel: "",
        maxLabel: "",
        gapCount: 0,
        refBandY: undefined as { y1: number; y2: number } | undefined,
      };
    }
    const values = points.map((p) => p.value);
    const rangeValues = referenceRange ? [...values, referenceRange.min, referenceRange.max] : values;
    const min = Math.min(...rangeValues);
    const max = Math.max(...rangeValues);
    const span = max - min || 1;
    const yFor = (v: number) => PADDING.top + innerH - ((v - min) / span) * innerH;
    const n = points.length;
    const xFor = (i: number) => (n === 1 ? PADDING.left + innerW / 2 : PADDING.left + (i / (n - 1)) * innerW);

    const dates = points.map((p) => p.date);
    const gaps = detectDateGaps(dates, 3);
    const gapPairs = new Set(gaps.map((g) => `${g.from}|${g.to}`));

    let solid = "";
    const dashed: string[] = [];
    points.forEach((p, i) => {
      const x = xFor(i);
      const y = yFor(p.value);
      if (i === 0) {
        solid += `M ${x} ${y} `;
        return;
      }
      const prev = points[i - 1];
      if (prev && gapPairs.has(`${prev.date}|${p.date}`)) {
        const px = xFor(i - 1);
        const py = yFor(prev.value);
        dashed.push(`M ${px} ${py} L ${x} ${y}`);
        solid += `M ${x} ${y} `;
      } else {
        solid += `L ${x} ${y} `;
      }
    });

    const dotList = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value), value: p.value, date: p.date }));

    return {
      path: solid,
      dashedSegments: dashed,
      dots: dotList,
      minLabel: formatNumber(min, digits),
      maxLabel: formatNumber(max, digits),
      gapCount: gaps.length,
      refBandY: referenceRange ? { y1: yFor(referenceRange.max), y2: yFor(referenceRange.min) } : undefined,
    };
  }, [points, innerW, innerH, digits, referenceRange]);

  if (points.length === 0) {
    return <EmptyState title={`尚無${label}資料`} description="新增一筆睡眠紀錄後即可顯示趨勢圖。" />;
  }

  const firstDate = points[0]?.date;
  const lastDate = points[points.length - 1]?.date;
  const midIndex = Math.floor((points.length - 1) / 2);
  const midDate = points[midIndex]?.date;

  return (
    <div>
      <svg
        role="img"
        aria-label={`${label}趨勢圖，單位${unit}，共 ${points.length} 個資料點`}
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {refBandY ? (
          <rect
            x={PADDING.left}
            y={refBandY.y1}
            width={innerW}
            height={Math.max(0, refBandY.y2 - refBandY.y1)}
            className="fill-accent-soft"
            opacity={0.5}
          />
        ) : null}
        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={height - PADDING.bottom} className="stroke-line" strokeWidth={1} />
        <line
          x1={PADDING.left}
          y1={height - PADDING.bottom}
          x2={WIDTH - PADDING.right}
          y2={height - PADDING.bottom}
          className="stroke-line"
          strokeWidth={1}
        />
        <text x={4} y={PADDING.top + 4} className="fill-ink-muted text-[10px]">
          {maxLabel}
        </text>
        <text x={4} y={height - PADDING.bottom} className="fill-ink-muted text-[10px]">
          {minLabel}
        </text>

        <path d={path} fill="none" className="stroke-ink" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {dashedSegments.map((seg, idx) => (
          <path key={idx} d={seg} fill="none" className="stroke-warning" strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round" />
        ))}

        {dots.map((dot, idx) => (
          <circle key={idx} cx={dot.x} cy={dot.y} r={2.5} className="fill-ink">
            <title>
              {dot.date}：{formatNumber(dot.value, digits)} {unit}
            </title>
          </circle>
        ))}

        {firstDate ? (
          <text x={PADDING.left} y={height - 6} className="fill-ink-muted text-[10px]">
            {formatDateShort(firstDate)}
          </text>
        ) : null}
        {midDate && points.length > 2 ? (
          <text x={WIDTH / 2} y={height - 6} textAnchor="middle" className="fill-ink-muted text-[10px]">
            {formatDateShort(midDate)}
          </text>
        ) : null}
        {lastDate ? (
          <text x={WIDTH - PADDING.right} y={height - 6} textAnchor="end" className="fill-ink-muted text-[10px]">
            {formatDateShort(lastDate)}
          </text>
        ) : null}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-caption text-ink-muted">
        <span>
          單位：<span className="tabular-nums text-ink-soft">{unit}</span>
        </span>
        {firstDate && lastDate ? (
          <span className="tabular-nums">
            範圍：{formatDateLong(firstDate)} – {formatDateLong(lastDate)}
          </span>
        ) : null}
        <span className="tabular-nums">資料點：{points.length}</span>
        {gapCount > 0 ? (
          <Badge tone="warning" withGlyph>
            含 {gapCount} 段資料缺口
          </Badge>
        ) : (
          <Badge tone="neutral" withGlyph>
            資料連續
          </Badge>
        )}
      </div>
    </div>
  );
}
