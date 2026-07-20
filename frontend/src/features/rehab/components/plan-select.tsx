"use client";

import { useEffect } from "react";

import { Select } from "@/components/ui/select";

import type { RehabPlan } from "../schema";
import { useRehabUiStore } from "../store";

export interface PlanSelectProps {
  plans: RehabPlan[];
}

/** 計畫選擇器：供「時間線」「每週摘要」分頁共用同一份選擇狀態（zustand 持久化）。 */
export function usePlanSelection(plans: RehabPlan[]): RehabPlan | undefined {
  const selectedPlanId = useRehabUiStore((s) => s.selectedPlanId);
  const setSelectedPlanId = useRehabUiStore((s) => s.setSelectedPlanId);

  useEffect(() => {
    if (plans.length === 0) return;
    const exists = plans.some((p) => p.id === selectedPlanId);
    if (!exists) {
      const firstActive = plans.find((p) => p.active) ?? plans[0];
      setSelectedPlanId(firstActive?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, selectedPlanId]);

  return plans.find((p) => p.id === selectedPlanId);
}

export function PlanSelect({ plans }: PlanSelectProps) {
  const selectedPlanId = useRehabUiStore((s) => s.selectedPlanId);
  const setSelectedPlanId = useRehabUiStore((s) => s.setSelectedPlanId);

  return (
    <Select
      label="選擇計畫"
      value={selectedPlanId ?? ""}
      onChange={(e) => setSelectedPlanId(e.target.value || null)}
      options={plans.map((p) => ({ value: p.id, label: `${p.name}${p.active ? "" : "（已暫停／結案）"}` }))}
      className="max-w-xs"
    />
  );
}
