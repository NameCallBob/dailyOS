"use client";

/**
 * sleep-correlation-panel.tsx — 睡眠時數 × 專注時間／運動 關聯圖。
 *
 * 重要：本面板只呈現「相關性」（皮爾森相關係數、分組平均比較），一律附帶樣本數與
 * 保守措辭（例如「弱正相關」而非「睡得多就會更專注」），且明確標示「相關不等於因果」。
 * 資料來源為唯讀讀取「專注」「運動」模組的資料表；若對應模組尚無資料，改以文字說明取代圖表，
 * 不得憑空產生數據。
 */

import { useId, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { CorrelationResult } from "../stats";
import { correlationStrengthLabel } from "../stats";
import { formatNumber } from "../utils";

export interface SleepCorrelationPanelProps {
  correlation: CorrelationResult;
}

const WIDTH = 480;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 30, left: 40 };

function ScatterChart({ points }: { points: CorrelationResult["points"] }) {
  const gradientId = useId();
  const withFocus = points.filter((p) => p.focusMinutes > 0 || p.hasWorkout);

  const { dots, maxX, maxY } = useMemo(() => {
    if (points.length === 0) return { dots: [], maxX: 1, maxY: 1 };
    const maxXValue = Math.max(...points.map((p) => p.sleepHours), 1);
    const maxYValue = Math.max(...points.map((p) => p.focusMinutes), 60);
    const innerW = WIDTH - PADDING.left - PADDING.right;
    const innerH = HEIGHT - PADDING.top - PADDING.bottom;
    const xFor = (v: number) => PADDING.left + (v / maxXValue) * innerW;
    const yFor = (v: number) => PADDING.top + innerH - (v / maxYValue) * innerH;
    return {
      dots: points.map((p) => ({ x: xFor(p.sleepHours), y: yFor(p.focusMinutes), ...p })),
      maxX: maxXValue,
      maxY: maxYValue,
    };
  }, [points]);

  if (withFocus.length === 0) {
    return <EmptyState title="尚無足夠的專注時間資料" description="「專注」模組累積更多每日紀錄後，即可比對睡眠時數與當日專注分鐘數。" />;
  }

  return (
    <svg
      role="img"
      aria-label={`睡眠時數與當日專注分鐘數散佈圖，共 ${points.length} 個資料點`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
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
        {Math.round(maxY)} 分
      </text>
      <text x={PADDING.left} y={HEIGHT - 8} className="fill-ink-muted text-[10px]">
        0 小時
      </text>
      <text x={WIDTH - PADDING.right} y={HEIGHT - 8} textAnchor="end" className="fill-ink-muted text-[10px]">
        {formatNumber(maxX, 1)} 小時
      </text>
      {dots.map((dot, idx) => (
        <circle key={idx} cx={dot.x} cy={dot.y} r={dot.hasWorkout ? 4 : 3} className={dot.hasWorkout ? "fill-accent" : "fill-ink"} opacity={0.85}>
          <title>
            {dot.date}：睡眠 {formatNumber(dot.sleepHours, 1)} 小時、專注 {dot.focusMinutes} 分鐘
            {dot.hasWorkout ? "（當日有運動紀錄）" : ""}
          </title>
        </circle>
      ))}
    </svg>
  );
}

export function SleepCorrelationPanel({ correlation }: SleepCorrelationPanelProps) {
  const rLabel = correlationStrengthLabel(correlation.focusCorrelation);
  const hasWorkoutComparison = correlation.avgSleepHoursOnWorkoutDays !== undefined && correlation.avgSleepHoursOnRestDays !== undefined;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>睡眠與專注／運動的關聯</CardTitle>
          <CardDescription>比對同一天的睡眠時數與專注、運動紀錄，觀察是否同向變化。</CardDescription>
        </div>
        <Badge tone="neutral" withGlyph>
          相關不等於因果
        </Badge>
      </CardHeader>

      <div className="flex flex-col gap-4">
        <ScatterChart points={correlation.points} />

        <div className="grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <div>
            <p className="text-label uppercase text-ink-muted">睡眠時數 × 當日專注分鐘數</p>
            <p className="mt-1 text-body text-ink">
              {correlation.focusCorrelation !== undefined ? (
                <>
                  {rLabel}（r ≈ <span className="tabular-nums">{formatNumber(correlation.focusCorrelation, 2)}</span>）
                </>
              ) : (
                rLabel
              )}
            </p>
          </div>
          <div>
            <p className="text-label uppercase text-ink-muted">運動日 vs. 非運動日 平均睡眠時數</p>
            {hasWorkoutComparison ? (
              <p className="mt-1 text-body text-ink">
                <span className="tabular-nums">{formatNumber(correlation.avgSleepHoursOnWorkoutDays, 1)}</span> 小時（{correlation.workoutDayCount} 天）
                {" "}vs.{" "}
                <span className="tabular-nums">{formatNumber(correlation.avgSleepHoursOnRestDays, 1)}</span> 小時（{correlation.restDayCount} 天）
              </p>
            ) : (
              <p className="mt-1 text-body text-ink-muted">「運動」模組尚無當期紀錄可比較。</p>
            )}
          </div>
        </div>

        <p className="border-t border-line pt-3 text-caption text-ink-muted">
          以上僅描述統計上的相關性（樣本數 {correlation.sampleCount} 天），不代表睡眠會「造成」專注或運動表現改變，兩者也可能同時受其他因素影響，僅供參考。
        </p>
      </div>
    </Card>
  );
}
