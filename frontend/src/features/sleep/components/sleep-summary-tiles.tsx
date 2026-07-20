import { StatTile } from "@/components/ui/stat-tile";
import type { WeeklyAverage } from "../stats";
import { formatNumber } from "../utils";

export interface SleepSummaryTilesProps {
  weekly: WeeklyAverage;
}

export function SleepSummaryTiles({ weekly }: SleepSummaryTilesProps) {
  if (weekly.count === 0) {
    return null;
  }

  const deltaTone = weekly.deltaHours === undefined ? "flat" : weekly.deltaHours > 0.05 ? "up" : weekly.deltaHours < -0.05 ? "down" : "flat";
  const deltaText =
    weekly.deltaHours === undefined
      ? undefined
      : `${weekly.deltaHours >= 0 ? "+" : ""}${formatNumber(weekly.deltaHours, 1)} 小時 較前週`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="本週平均時數" value={formatNumber(weekly.avgHours, 1)} unit="小時" delta={deltaText} deltaTone={deltaTone} />
      <StatTile label="本週平均品質" value={formatNumber(weekly.avgQuality, 1)} unit="/ 5" />
      <StatTile label="本週平均清醒次數" value={formatNumber(weekly.avgAwakenings, 1)} unit="次" />
      <StatTile label="本週平均晨間精神" value={formatNumber(weekly.avgMorningEnergy, 1)} unit="/ 5" />
    </div>
  );
}
