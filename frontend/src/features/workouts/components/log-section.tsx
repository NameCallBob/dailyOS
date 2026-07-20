"use client";

/** log-section.tsx — 訓練紀錄清單：新增／編輯／刪除訓練，套用上次、套用範本。 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { useDuplicateWorkout } from "../hooks";
import { workoutsResource } from "../resources";
import type { Workout } from "../schema";
import { useWorkoutsStore } from "../store";
import { WORKOUT_TYPE_OPTIONS } from "../types";
import { combineDateTime, formatDateLong, sortByDateAsc, todayIsoDate } from "../utils";
import { TemplatesDialog } from "./templates-dialog";
import { UndoBanner } from "./undo-banner";
import { WorkoutCard } from "./workout-card";
import { WorkoutDetailSheet } from "./workout-detail-sheet";
import { WorkoutFormSheet } from "./workout-form-sheet";

const TYPE_FILTER_OPTIONS = [{ value: "all", label: "全部類型" }, ...WORKOUT_TYPE_OPTIONS];

export function LogSection() {
  const listQuery = workoutsResource.useList({ ordering: "-date", pageSize: 200 });
  const removeMutation = workoutsResource.useRemove();
  const updateMutation = workoutsResource.useUpdate();
  const duplicate = useDuplicateWorkout();

  const typeFilter = useWorkoutsStore((s) => s.typeFilter);
  const setTypeFilter = useWorkoutsStore((s) => s.setTypeFilter);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [detail, setDetail] = useState<Workout | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [deleted, setDeleted] = useState<Workout | null>(null);

  const all = listQuery.data?.results ?? [];
  const records = useMemo(() => all.filter((w) => !w.isTemplate), [all]);

  const filtered = useMemo(() => {
    const desc = [...sortByDateAsc(records)].reverse();
    if (typeFilter === "all") return desc;
    return desc.filter((w) => w.type === typeFilter);
  }, [records, typeFilter]);

  const lastWorkout = useMemo(() => {
    const asc = sortByDateAsc(records);
    return asc.length > 0 ? asc[asc.length - 1] : undefined;
  }, [records]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(workout: Workout) {
    setEditing(workout);
    setDetail(null);
    setFormOpen(true);
  }

  async function handleApplyLast() {
    if (!lastWorkout) {
      toast.info("目前尚無可套用的歷史訓練");
      return;
    }
    const date = todayIsoDate();
    const startAt = combineDateTime(date, "07:00");
    try {
      await duplicate.mutateAsync({ sourceId: lastWorkout.id, target: { date, startAt } });
      toast.success("已套用上次訓練，建立今日新紀錄");
    } catch {
      // 失敗提示已由 hooks.ts 統一顯示。
    }
  }

  async function handleDelete(workout: Workout) {
    try {
      await removeMutation.mutateAsync(workout.id);
      setDeleted(workout);
      toast.info("已刪除該筆訓練紀錄");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  async function handleUndo() {
    if (!deleted) return;
    try {
      await updateMutation.mutateAsync({ id: deleted.id, patch: { deleted: false } });
      toast.success("已復原該筆訓練紀錄");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    } finally {
      setDeleted(null);
    }
  }

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (listQuery.isError) {
    return <ErrorState onRetry={() => listQuery.refetch()} description="訓練紀錄載入失敗，請檢查連線後重試。" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          label="篩選類型"
          className="w-40"
          options={TYPE_FILTER_OPTIONS}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
        />
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setTemplatesOpen(true)}>
            使用範本
          </Button>
          <Button type="button" variant="secondary" onClick={handleApplyLast} loading={duplicate.isPending} disabled={!lastWorkout}>
            套用上次
          </Button>
          <Button type="button" onClick={openCreate}>
            + 新增訓練
          </Button>
        </div>
      </div>

      {deleted ? (
        <UndoBanner message={`已刪除 ${formatDateLong(deleted.date)} 的訓練紀錄`} onUndo={handleUndo} onDismiss={() => setDeleted(null)} />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title="尚無訓練紀錄" description="點選「新增訓練」開始記錄，或使用範本／套用上次快速建立。" />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((workout) => (
            <div key={workout.id} className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">{formatDateLong(workout.date)}</span>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <WorkoutCard workout={workout} onOpen={() => setDetail(workout)} />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(workout)}>
                  刪除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <WorkoutFormSheet open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onCreated={(w) => setDetail(w)} />
      <WorkoutDetailSheet workout={detail} onClose={() => setDetail(null)} onEdit={openEdit} />
      <TemplatesDialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </div>
  );
}
