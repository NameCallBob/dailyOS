"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";

import { METRIC_RANGE_OPTIONS } from "../constants";
import { bodyMetricsResource, userProfileResource } from "../resources";
import type { BodyMetric } from "../schema";
import { sortByDateAsc, summarizeTrend, withinLastDays } from "../utils";
import { MetricFormSheet } from "./metric-form-sheet";
import { MetricLineChart } from "./metric-line-chart";
import { MetricsSummary } from "./metrics-summary";
import { MetricsTable } from "./metrics-table";

export function MetricsSection() {
  const listQuery = bodyMetricsResource.useList({ ordering: "-date", pageSize: 200 });
  const profileQuery = userProfileResource.useList({ ordering: "-updatedAt", pageSize: 1 });

  const [range, setRange] = useState<string>("30");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BodyMetric | null>(null);

  const records = useMemo(() => listQuery.data?.results ?? [], [listQuery.data]);
  const heightCm = profileQuery.data?.results[0]?.heightCm;

  const rangedRecords = useMemo(() => {
    const ascByDate = sortByDateAsc(records);
    if (range === "all") return ascByDate;
    return withinLastDays(ascByDate, Number(range));
  }, [records, range]);

  const recordsAsc = useMemo(() => sortByDateAsc(records), [records]);
  const latest = recordsAsc.length > 0 ? recordsAsc[recordsAsc.length - 1] : undefined;

  const weightPoints = rangedRecords.map((r) => ({ date: r.date, value: r.weightKg, manual: r.source === "manual" }));
  const weightTrend = summarizeTrend(weightPoints.map((p) => p.value));

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(record: BodyMetric) {
    setEditing(record);
    setSheetOpen(true);
  }

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (listQuery.isError) {
    return <ErrorState onRetry={() => listQuery.refetch()} description="身形量測資料載入失敗，請檢查連線後重試。" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3 text-ink">量測總覽</h2>
        <Button type="button" onClick={openCreate}>
          + 新增量測
        </Button>
      </div>

      <MetricsSummary latest={latest} heightCm={heightCm} />

      <section className="rounded-lg border border-line bg-paper-raised p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-body font-medium text-ink">體重趨勢</h3>
          <Segmented label="圖表區間" options={METRIC_RANGE_OPTIONS} value={range} onChange={setRange} />
        </div>
        <MetricLineChart points={weightPoints} unit="公斤 (kg)" label="體重" digits={1} />
        <p className="mt-3 text-caption text-ink-muted">
          {weightTrend.sufficient && weightTrend.deltaFromFirst !== undefined
            ? `區間內共 ${weightTrend.pointCount} 筆紀錄，較區間起始變化 ${weightTrend.deltaFromFirst > 0 ? "+" : ""}${weightTrend.deltaFromFirst.toFixed(1)} kg（僅供參考，非醫療判讀）。`
            : "此區間資料點不足（少於 3 筆），暫不提供趨勢判讀；請避免以單次量測下結論。"}
        </p>
      </section>

      <section>
        <h3 className="mb-3 text-body font-medium text-ink">量測紀錄</h3>
        <MetricsTable records={[...recordsAsc].reverse()} onEdit={openEdit} />
      </section>

      <MetricFormSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editing={editing} />
    </div>
  );
}
