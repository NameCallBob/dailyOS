"use client";

/** library-section.tsx — 動作庫管理（新增／編輯／刪除自訂動作）+ 個人最佳（PR）清單。 */

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { exerciseDefsResource, workoutExercisesResource, workoutSetsResource, workoutsResource } from "../resources";
import type { ExerciseDef } from "../schema";
import { computePersonalBests } from "../utils";
import { UndoBanner } from "./undo-banner";
import { ExerciseDefFormSheet } from "./exercise-def-form-sheet";
import { PrList } from "./pr-list";

export function LibrarySection() {
  const defsQuery = exerciseDefsResource.useList({ ordering: "category", pageSize: 200 });
  const workoutsQuery = workoutsResource.useList({ pageSize: 200 });
  const exercisesQuery = workoutExercisesResource.useList({ pageSize: 500 });
  const setsQuery = workoutSetsResource.useList({ pageSize: 1000 });
  const removeMutation = exerciseDefsResource.useRemove();
  const updateMutation = exerciseDefsResource.useUpdate();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseDef | null>(null);
  const [deleted, setDeleted] = useState<ExerciseDef | null>(null);

  const defs = defsQuery.data?.results ?? [];
  const workouts = workoutsQuery.data?.results ?? [];
  const exercises = exercisesQuery.data?.results ?? [];
  const sets = setsQuery.data?.results ?? [];

  const personalBests = useMemo(() => {
    const dateByWorkoutId = new Map(workouts.map((w) => [w.id, w.date]));
    const dateByExerciseId = new Map(exercises.map((we) => [we.id, dateByWorkoutId.get(we.workoutId) ?? ""]));
    return computePersonalBests(sets, exercises, dateByExerciseId);
  }, [workouts, exercises, sets]);

  const nameByExerciseId = useMemo(() => new Map(defs.map((d) => [d.id, d.name])), [defs]);

  const isLoading = defsQuery.isLoading;
  const isError = defsQuery.isError;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(def: ExerciseDef) {
    setEditing(def);
    setFormOpen(true);
  }

  async function handleDelete(def: ExerciseDef) {
    try {
      await removeMutation.mutateAsync(def.id);
      setDeleted(def);
      toast.info(`已刪除「${def.name}」`);
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  async function handleUndo() {
    if (!deleted) return;
    try {
      await updateMutation.mutateAsync({ id: deleted.id, patch: { deleted: false } });
      toast.success("已復原該動作");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    } finally {
      setDeleted(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>個人最佳（PR）</CardTitle>
        </CardHeader>
        <PrList bests={personalBests} nameByExerciseId={nameByExerciseId} />
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-h3 text-ink">動作庫</h2>
          <Button type="button" onClick={openCreate}>
            + 新增自訂動作
          </Button>
        </div>

        {deleted ? <UndoBanner message={`已刪除「${deleted.name}」`} onUndo={handleUndo} onDismiss={() => setDeleted(null)} className="mb-3" /> : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <ErrorState description="動作庫載入失敗，請檢查連線後重試。" onRetry={() => defsQuery.refetch()} />
        ) : defs.length === 0 ? (
          <EmptyState title="動作庫是空的" description="新增自訂動作，之後即可在訓練中快速選用。" />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {defs.map((def) => (
              <li key={def.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-body text-ink">{def.name}</span>
                  <Badge tone="neutral">{def.category}</Badge>
                  {def.equipment ? <span className="text-caption text-ink-muted">{def.equipment}</span> : null}
                  {!def.isCustom ? <Badge tone="accent">內建</Badge> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(def)}>
                    編輯
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(def)}>
                    刪除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ExerciseDefFormSheet open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </div>
  );
}
