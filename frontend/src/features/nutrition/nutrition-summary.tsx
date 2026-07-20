import { StatTile } from "@/components/ui/stat-tile";

import type { NutrientTotals } from "./utils";

export function NutritionSummary({ totals }: { totals: NutrientTotals }) {
  return (
    <section aria-label="營養彙總" className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="熱量" value={Math.round(totals.calories)} unit="kcal" />
        <StatTile label="蛋白質" value={Math.round(totals.protein)} unit="g" />
        <StatTile label="碳水" value={Math.round(totals.carb)} unit="g" />
        <StatTile label="脂肪" value={Math.round(totals.fat)} unit="g" />
        <StatTile label="水分" value={Math.round(totals.water)} unit="ml" />
      </div>
      {totals.totalCount > 0 && totals.loggedCount < totals.totalCount ? (
        <p className="text-caption text-ink-muted">
          {totals.totalCount - totals.loggedCount} 筆紀錄尚未填寫營養數值，彙總僅計入已填寫的部分。
        </p>
      ) : null}
    </section>
  );
}
