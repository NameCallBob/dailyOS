"use client";

import { useMemo } from "react";

import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";

import { BatchAddForm } from "./batch-add-form";
import { MealForm } from "./meal-form";
import { MealList } from "./meal-list";
import { NutritionSummary } from "./nutrition-summary";
import { QuickActionsBar } from "./quick-actions-bar";
import { mealLogsResource } from "./resource";
import { useNutritionUiStore, type DateRangeFilter } from "./store";
import { MEAL_TYPE_LABELS, MEAL_TYPES, type MealLog } from "./types";
import { sumNutrients, todayDateStr, withinRange, yesterdayDateStr } from "./utils";

const DATE_RANGE_OPTIONS: Array<{ value: DateRangeFilter; label: string }> = [
  { value: "today", label: "今天" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "all", label: "全部" },
];

export function NutritionPageClient() {
  const { data, isLoading, isError, refetch } = mealLogsResource.useList({
    ordering: "-loggedAt",
    pageSize: 500,
  });
  const {
    sheetOpen,
    editingId,
    batchMode,
    dateRange,
    typeFilter,
    openCreateSheet,
    openEditSheet,
    openBatchSheet,
    closeSheet,
    setDateRange,
    setTypeFilter,
  } = useNutritionUiStore();

  const allLogs = useMemo(() => data?.results ?? [], [data]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (!withinRange(log.date, dateRange)) return false;
      if (typeFilter !== "all" && log.type !== typeFilter) return false;
      return true;
    });
  }, [allLogs, dateRange, typeFilter]);

  const todayLogs = useMemo(() => allLogs.filter((log) => log.date === todayDateStr()), [allLogs]);
  const yesterdayLogs = useMemo(() => allLogs.filter((log) => log.date === yesterdayDateStr()), [allLogs]);
  const totals = useMemo(() => sumNutrients(todayLogs), [todayLogs]);

  const createMutation = mealLogsResource.useCreate();

  async function handleCopyYesterday() {
    if (yesterdayLogs.length === 0) {
      toast.info("昨天沒有紀錄可以複製。");
      return;
    }
    const today = todayDateStr();
    const now = new Date();
    let count = 0;
    for (const log of yesterdayLogs) {
      const loggedAt = new Date(log.loggedAt);
      loggedAt.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      const patch: Partial<MealLog> = {
        type: log.type,
        date: today,
        loggedAt: Number.isNaN(loggedAt.getTime()) ? now.toISOString() : loggedAt.toISOString(),
        text: log.text,
        foodTags: log.foodTags,
        portion: log.portion,
        photo: log.photo,
        calories: log.calories,
        protein: log.protein,
        carb: log.carb,
        fat: log.fat,
        calcium: log.calcium,
        fiber: log.fiber,
        water: log.water,
        customNutrients: log.customNutrients,
        notes: log.notes,
      };
      try {
        // eslint-disable-next-line no-await-in-loop
        await createMutation.mutateAsync(patch);
        count += 1;
      } catch {
        // 失敗提示由 mutation 統一處理，繼續複製其餘筆數
      }
    }
    if (count > 0) toast.success(`已從昨天複製 ${count} 筆紀錄到今天。`);
  }

  const editingLog = editingId ? allLogs.find((log) => log.id === editingId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">飲食</h1>
        <p className="text-caption text-ink-muted">記錄每一餐，數字可以之後再補；重點是先記下來。</p>
      </header>

      <NutritionSummary totals={totals} />

      <QuickActionsBar
        recentLogs={allLogs}
        onOpenCreate={openCreateSheet}
        onOpenBatch={openBatchSheet}
        onCopyYesterday={handleCopyYesterday}
        copyYesterdayDisabled={yesterdayLogs.length === 0}
      />

      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="日期範圍"
          value={dateRange}
          onChange={(v) => setDateRange(v as DateRangeFilter)}
          options={DATE_RANGE_OPTIONS}
        />
        <Tabs
          items={[{ value: "all", label: "全部餐別" }, ...MEAL_TYPES.map((t) => ({ value: t, label: MEAL_TYPE_LABELS[t] }))]}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as typeof typeFilter)}
        />
      </div>

      <MealList
        logs={filteredLogs}
        isLoading={isLoading}
        isError={isError}
        isEmptySource={allLogs.length === 0}
        onRetry={() => refetch()}
        onEdit={openEditSheet}
        onOpenCreate={openCreateSheet}
      />

      <Sheet
        open={sheetOpen}
        onClose={closeSheet}
        title={batchMode ? "批次新增飲食紀錄" : editingId ? "編輯飲食紀錄" : "新增飲食紀錄"}
        description={batchMode ? "一次輸入多筆，適合把今天漏記的餐點一起補上" : undefined}
      >
        {batchMode ? (
          <BatchAddForm onDone={closeSheet} />
        ) : (
          <MealForm
            mode={editingId ? "edit" : "create"}
            recordId={editingId ?? undefined}
            initial={
              editingLog
                ? {
                    type: editingLog.type,
                    date: editingLog.date,
                    time: new Date(editingLog.loggedAt).toTimeString().slice(0, 5),
                    text: editingLog.text,
                    portion: editingLog.portion,
                    foodTags: editingLog.foodTags,
                    photo: editingLog.photo,
                    calories: editingLog.calories,
                    protein: editingLog.protein,
                    carb: editingLog.carb,
                    fat: editingLog.fat,
                    calcium: editingLog.calcium,
                    fiber: editingLog.fiber,
                    water: editingLog.water,
                    customNutrients: editingLog.customNutrients,
                    notes: editingLog.notes,
                  }
                : undefined
            }
            onDone={closeSheet}
          />
        )}
      </Sheet>
    </div>
  );
}
