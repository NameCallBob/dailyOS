"use client";

import { Input } from "@/components/ui/input";

export interface StepGoalsProps {
  waterGoalMl: number;
  sleepGoalHours: number;
  stepGoalSteps: number;
  onChange: (patch: Partial<{ waterGoalMl: number; sleepGoalHours: number; stepGoalSteps: number }>) => void;
}

/** 第四步：每日基本目標（飲水／睡眠／步數），皆有合理預設值可直接沿用。 */
export function StepGoals({ waterGoalMl, sleepGoalHours, stepGoalSteps, onChange }: StepGoalsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Input
        label="每日飲水目標（毫升）"
        type="number"
        inputMode="numeric"
        min={500}
        max={8000}
        value={waterGoalMl}
        onChange={(e) => onChange({ waterGoalMl: Number(e.target.value) || 0 })}
      />
      <Input
        label="每日睡眠目標（小時）"
        type="number"
        inputMode="decimal"
        step="0.5"
        min={3}
        max={14}
        value={sleepGoalHours}
        onChange={(e) => onChange({ sleepGoalHours: Number(e.target.value) || 0 })}
      />
      <Input
        label="每日步數目標（步）"
        type="number"
        inputMode="numeric"
        min={1000}
        max={50000}
        value={stepGoalSteps}
        onChange={(e) => onChange({ stepGoalSteps: Number(e.target.value) || 0 })}
      />
    </div>
  );
}
