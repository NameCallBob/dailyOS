"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";

import { rehabExercisesResource, rehabPlansResource } from "../resources";
import type { RehabExercise, RehabPlan } from "../schema";
import { formatDateLong, sortExercisesByOrder } from "../utils";
import { ExerciseFormSheet } from "./exercise-form-sheet";
import { UndoBanner } from "./undo-banner";

export interface PlanCardProps {
  plan: RehabPlan;
  exercises: RehabExercise[];
  onEditPlan: () => void;
}

export function PlanCard({ plan, exercises, onEditPlan }: PlanCardProps) {
  const [expanded, setExpanded] = useState(plan.active);
  const [exerciseSheetOpen, setExerciseSheetOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<RehabExercise | null>(null);
  const [deletedExercise, setDeletedExercise] = useState<RehabExercise | null>(null);
  const [deletedPlan, setDeletedPlan] = useState(false);

  const updatePlanMutation = rehabPlansResource.useUpdate();
  const removePlanMutation = rehabPlansResource.useRemove();
  const removeExerciseMutation = rehabExercisesResource.useRemove();
  const restoreExerciseMutation = rehabExercisesResource.useUpdate();

  const sorted = sortExercisesByOrder(exercises);
  const activeCount = sorted.filter((e) => !e.stopDate).length;

  async function handleToggleActive() {
    try {
      await updatePlanMutation.mutateAsync({ id: plan.id, patch: { active: !plan.active } });
      toast.success(plan.active ? "已暫停此計畫" : "已恢復此計畫");
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  }

  async function handleDeletePlan() {
    try {
      await removePlanMutation.mutateAsync(plan.id);
      setDeletedPlan(true);
      toast.info("已刪除此計畫");
    } catch {
      // no-op
    }
  }

  async function handleUndoDeletePlan() {
    try {
      await updatePlanMutation.mutateAsync({ id: plan.id, patch: { deleted: false } });
      toast.success("已復原計畫");
    } finally {
      setDeletedPlan(false);
    }
  }

  async function handleDeleteExercise(exercise: RehabExercise) {
    try {
      await removeExerciseMutation.mutateAsync(exercise.id);
      setDeletedExercise(exercise);
      toast.info(`已刪除項目「${exercise.name}」`);
    } catch {
      // no-op
    }
  }

  async function handleUndoDeleteExercise() {
    if (!deletedExercise) return;
    try {
      await restoreExerciseMutation.mutateAsync({ id: deletedExercise.id, patch: { deleted: false } });
      toast.success("已復原項目");
    } finally {
      setDeletedExercise(null);
    }
  }

  if (deletedPlan) {
    return <UndoBanner message={`已刪除計畫「${plan.name}」`} onUndo={handleUndoDeletePlan} onDismiss={() => setDeletedPlan(false)} />;
  }

  return (
    <div className="rounded-lg border border-line bg-paper-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-h3 text-ink">{plan.name}</h3>
            <Badge tone={plan.active ? "success" : "neutral"}>{plan.active ? "進行中" : "已暫停／結案"}</Badge>
            {plan.bodyRegion ? <Badge tone="accent">{plan.bodyRegion}</Badge> : null}
          </div>
          <p className="text-caption text-ink-muted">
            {plan.therapistName ? `${plan.therapistName}` : ""}
            {plan.clinicName ? ` ・ ${plan.clinicName}` : ""}
            {` ・ 開始於 ${formatDateLong(plan.startDate)}`}
            {plan.nextAppointmentAt ? ` ・ 下次回診 ${formatDateLong(plan.nextAppointmentAt)}` : ""}
          </p>
          {plan.goal ? <p className="text-caption text-ink-soft">目標：{plan.goal}</p> : null}
          {plan.generalCautions ? <p className="text-caption text-warning">注意：{plan.generalCautions}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "收合項目" : `展開項目（${activeCount}）`}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onEditPlan}>
            編輯計畫
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleToggleActive}>
            {plan.active ? "暫停" : "恢復"}
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={handleDeletePlan}>
            刪除
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-body font-medium text-ink">復健項目</h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingExercise(null);
                setExerciseSheetOpen(true);
              }}
            >
              + 新增項目
            </Button>
          </div>

          {deletedExercise ? (
            <UndoBanner
              className="mb-3"
              message={`已刪除項目「${deletedExercise.name}」`}
              onUndo={handleUndoDeleteExercise}
              onDismiss={() => setDeletedExercise(null)}
            />
          ) : null}

          {sorted.length === 0 ? (
            <EmptyState title="尚無復健項目" description="點選「新增項目」開始為此計畫加入動作、劑量與注意事項。" />
          ) : (
            <ul className="flex flex-col gap-3">
              {sorted.map((exercise) => (
                <li key={exercise.id} className="rounded-md border border-line bg-paper p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-body font-medium text-ink">{exercise.name}</span>
                        {exercise.stopDate ? (
                          <Badge tone="neutral">已於 {formatDateLong(exercise.stopDate)} 停止</Badge>
                        ) : (
                          <Badge tone="success">執行中</Badge>
                        )}
                      </div>
                      {exercise.instructions ? <p className="text-caption text-ink-soft">{exercise.instructions}</p> : null}
                      <p className="text-caption tabular-nums text-ink-muted">
                        {exercise.sets ? `${exercise.sets} 組` : ""}
                        {exercise.reps ? ` × ${exercise.reps} 下` : ""}
                        {exercise.durationSec ? ` ・ ${exercise.durationSec} 秒` : ""}
                        {exercise.loadLimit ? ` ・ 負重上限 ${exercise.loadLimit}` : ""}
                        {exercise.angle ? ` ・ 角度 ${exercise.angle}` : ""}
                        {exercise.frequency ? ` ・ 頻率 ${exercise.frequency}` : ""}
                        {` ・ 生效 ${formatDateLong(exercise.effectiveDate)}`}
                      </p>
                      {exercise.cautions ? <p className="text-caption text-warning">注意：{exercise.cautions}</p> : null}
                      {exercise.therapistNote ? <p className="text-caption text-ink-muted">治療師備註：{exercise.therapistNote}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingExercise(exercise);
                          setExerciseSheetOpen(true);
                        }}
                      >
                        編輯
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteExercise(exercise)}>
                        刪除
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <ExerciseFormSheet
        open={exerciseSheetOpen}
        onClose={() => setExerciseSheetOpen(false)}
        rehabPlanId={plan.id}
        editing={editingExercise}
        nextOrder={sorted.length + 1}
      />
    </div>
  );
}
