/**
 * chart-caption.tsx — 圖表下方的中繼資訊列：單位、日期範圍、資料缺口、是否手動輸入。
 * 依架構規範，所有圖表都必須標示這四項，狀態不可僅靠顏色，故一律附文字。
 */

import { Badge } from "@/components/ui/badge";
import { formatDateLong } from "../utils";

export interface ChartCaptionProps {
  unit: string;
  rangeFromIso?: string;
  rangeToIso?: string;
  gapCount: number;
  allManual: boolean;
  pointCount: number;
}

export function ChartCaption({ unit, rangeFromIso, rangeToIso, gapCount, allManual, pointCount }: ChartCaptionProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-caption text-ink-muted">
      <span>
        單位：<span className="tabular-nums text-ink-soft">{unit}</span>
      </span>
      {rangeFromIso && rangeToIso ? (
        <span className="tabular-nums">
          範圍：{formatDateLong(rangeFromIso)} – {formatDateLong(rangeToIso)}
        </span>
      ) : null}
      <span className="tabular-nums">資料點：{pointCount}</span>
      {gapCount > 0 ? (
        <Badge tone="warning" withGlyph>
          含 {gapCount} 段資料缺口
        </Badge>
      ) : (
        <Badge tone="neutral" withGlyph>
          資料連續
        </Badge>
      )}
      <Badge tone={allManual ? "neutral" : "accent"} withGlyph>
        {allManual ? "全部為手動輸入" : "含裝置同步資料"}
      </Badge>
    </div>
  );
}
