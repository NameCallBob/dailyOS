import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/ui/stat-tile";

import type { BodyMetric } from "../schema";
import { bmiCategory, calcBmi, formatDateLong, formatNumber } from "../utils";

export interface MetricsSummaryProps {
  latest?: BodyMetric;
  heightCm?: number;
}

export function MetricsSummary({ latest, heightCm }: MetricsSummaryProps) {
  const bmi = calcBmi(latest?.weightKg, heightCm);
  const category = bmiCategory(bmi);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="體重" value={formatNumber(latest?.weightKg, 1)} unit="kg" />
        <StatTile
          label="BMI（依身高換算）"
          value={bmi !== undefined ? formatNumber(bmi, 1) : "—"}
          unit={category ?? (heightCm ? "" : "需先設定身高")}
        />
        <StatTile label="體脂率" value={formatNumber(latest?.bodyFatPercent, 1)} unit="%" />
        <StatTile label="腰圍" value={formatNumber(latest?.waistCm, 1)} unit="cm" />
      </div>
      {latest ? (
        <p className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <span>最後更新：{formatDateLong(latest.date)}</span>
          <Badge tone={latest.source === "manual" ? "neutral" : "accent"} withGlyph>
            {latest.source === "manual" ? "手動輸入" : "裝置同步"}
          </Badge>
          {!heightCm ? <Badge tone="warning" withGlyph>尚未設定身高，無法換算 BMI</Badge> : null}
        </p>
      ) : null}
    </div>
  );
}
