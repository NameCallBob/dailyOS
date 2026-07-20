import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { RegularityResult } from "../stats";

export interface SleepRegularityCardProps {
  regularity: RegularityResult;
  windowDays: number;
}

const TONE_BY_LABEL: Record<string, BadgeTone> = {
  非常規律: "success",
  尚稱規律: "accent",
  不規律: "warning",
  資料不足: "neutral",
};

export function SleepRegularityCard({ regularity, windowDays }: SleepRegularityCardProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>作息規律度</CardTitle>
          <CardDescription>依近 {windowDays} 天上床、起床時間的一致程度估算，僅供參考。</CardDescription>
        </div>
        <Badge tone={TONE_BY_LABEL[regularity.label] ?? "neutral"}>{regularity.label}</Badge>
      </CardHeader>
      {regularity.sufficient && regularity.score !== undefined ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <span className="text-numeric tabular-nums text-ink">{regularity.score}</span>
            <span className="mb-1 text-caption text-ink-muted">/ 100 分</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-paper-sunken" role="img" aria-label={`規律度分數 ${regularity.score} 分（滿分 100）`}>
            <div className="h-full rounded-full bg-ink" style={{ width: `${regularity.score}%` }} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-caption text-ink-muted">
            <div>
              <dt>上床時間標準差</dt>
              <dd className="tabular-nums text-ink">{regularity.bedtimeStdDevMinutes} 分鐘</dd>
            </div>
            <div>
              <dt>起床時間標準差</dt>
              <dd className="tabular-nums text-ink">{regularity.wakeStdDevMinutes} 分鐘</dd>
            </div>
          </dl>
          <p className="text-caption text-ink-muted">樣本數：{regularity.sampleCount} 筆。標準差越小代表作息時間越一致。</p>
        </div>
      ) : (
        <p className="text-body text-ink-muted">
          近 {windowDays} 天僅有 {regularity.sampleCount} 筆紀錄，累積至少 4 筆後即可估算作息規律度。
        </p>
      )}
    </Card>
  );
}
