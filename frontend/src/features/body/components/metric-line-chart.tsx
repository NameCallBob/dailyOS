"use client";

/**
 * metric-line-chart.tsx — 單一數值指標的折線圖（例如體重趨勢）。
 * 缺口以虛線＋中斷標示；不足 3 個資料點時不顯示趨勢判讀文字（由呼叫端另外處理）。
 */

import { useId, useMemo } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ChartCaption } from "./chart-caption";
import { detectDateGaps, formatDateShort, formatNumber } from "../utils";

export interface MetricLineChartPoint {
  date: string;
  value: number;
  manual: boolean;
}

export interface MetricLineChartProps {
  points: MetricLineChartPoint[];
  unit: string;
  label: string;
  height?: number;
  digits?: number;
}

const WIDTH = 640;
const PADDING = { top: 20, right: 16, bottom: 26, left: 44 };

export function MetricLineChart({ points, unit, label, height = 200, digits = 1 }: MetricLineChartProps) {
  const gradientId = useId();
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const { path, dashedSegments, dots, minLabel, maxLabel, gapCount } = useMemo(() => {
    if (points.length === 0) {
      return { path: "", dashedSegments: [] as string[], dots: [] as Array<{ x: number; y: number; manual: boolean; value: number; date: string }>, minLabel: "", maxLabel: "", gapCount: 0 };
    }
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const yFor = (v: number) => PADDING.top + innerH - ((v - min) / span) * innerH;
    const n = points.length;
    const xFor = (i: number) => (n === 1 ? PADDING.left + innerW / 2 : PADDING.left + (i / (n - 1)) * innerW);

    const dates = points.map((p) => p.date);
    const gaps = detectDateGaps(dates, 4);
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

    const dotList = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value), manual: p.manual, value: p.value, date: p.date }));

    return {
      path: solid,
      dashedSegments: dashed,
      dots: dotList,
      minLabel: formatNumber(min, digits),
      maxLabel: formatNumber(max, digits),
      gapCount: gaps.length,
    };
  }, [points, innerW, innerH, digits]);

  if (points.length === 0) {
    return <EmptyState title={`尚無${label}資料`} description="新增一筆量測後即可顯示趨勢圖。" />;
  }

  const firstDate = points[0]?.date;
  const lastDate = points[points.length - 1]?.date;
  const midIndex = Math.floor((points.length - 1) / 2);
  const midDate = points[midIndex]?.date;
  const allManual = points.every((p) => p.manual);

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
        {/* y 軸格線與標籤 */}
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

        {/* 主線 */}
        <path d={path} fill="none" className="stroke-ink" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {dashedSegments.map((seg, idx) => (
          <path
            key={idx}
            d={seg}
            fill="none"
            className="stroke-warning"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        ))}

        {/* 資料點 */}
        {dots.map((dot, idx) => (
          <circle
            key={idx}
            cx={dot.x}
            cy={dot.y}
            r={dot.manual ? 3 : 2.5}
            className={dot.manual ? "fill-ink" : "fill-accent"}
          >
            <title>
              {dot.date}：{formatNumber(dot.value, digits)} {unit}
              {dot.manual ? "（手動輸入）" : "（裝置同步）"}
            </title>
          </circle>
        ))}

        {/* x 軸標籤：起、中、末 */}
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
      <ChartCaption
        unit={unit}
        rangeFromIso={firstDate}
        rangeToIso={lastDate}
        gapCount={gapCount}
        allManual={allManual}
        pointCount={points.length}
      />
    </div>
  );
}
