"use client";

/**
 * plans-tab.tsx — 「復健計畫」：計畫清單（含已暫停／結案），可展開管理底下的項目。
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";

import { rehabExercisesResource, rehabPlansResource } from "../resources";
import type { RehabPlan } from "../schema";
import { PlanCard } from "./plan-card";
import { PlanFormSheet } from "./plan-form-sheet";

export function PlansTab() {
  const plansQuery = rehabPlansResource.useList({ ordering: "-active", pageSize: 100 });
  const exercisesQuery = rehabExercisesResource.useList({ pageSize: 500 });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RehabPlan | null>(null);

  const plans = useMemo(() => plansQuery.data?.results ?? [], [plansQuery.data]);
  const exercises = useMemo(() => exercisesQuery.data?.results ?? [], [exercisesQuery.data]);

  const isLoading = plansQuery.isLoading || exercisesQuery.isLoading;
  const isError = plansQuery.isError || exercisesQuery.isError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description="復健計畫載入失敗，請檢查連線後重試。"
        onRetry={() => {
          plansQuery.refetch();
          exercisesQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3 text-ink">所有計畫</h2>
        <Button
          type="button"
          onClick={() => {
            setEditingPlan(null);
            setSheetOpen(true);
          }}
        >
          + 新增計畫
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState title="尚無復健計畫" description="點選「新增計畫」建立第一個復健計畫，之後可在計畫底下新增各項目。" />
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              exercises={exercises.filter((e) => e.rehabPlanId === plan.id)}
              onEditPlan={() => {
                setEditingPlan(plan);
                setSheetOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <PlanFormSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editing={editingPlan} />
    </div>
  );
}
