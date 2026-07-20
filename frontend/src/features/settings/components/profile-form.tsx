"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ACTIVITY_LEVEL_OPTIONS, FITNESS_GOAL_OPTIONS, SEX_OPTIONS } from "../constants";
import { useSingletonResource } from "../hooks";
import { userProfileResource } from "../resources";
import type { UserProfile } from "../schema";
import { seedUserProfile } from "../seed";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";

function optionalNumber(min: number, max: number, isInt = false) {
  const base = isInt ? z.number().int() : z.number();
  return z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
    base.min(min, `數值需介於 ${min}-${max}`).max(max, `數值需介於 ${min}-${max}`).optional(),
  );
}

const formSchema = z.object({
  displayName: z.string().max(40).optional().or(z.literal("")),
  heightCm: optionalNumber(50, 260),
  weightKg: optionalNumber(20, 400),
  birthYear: optionalNumber(1900, new Date().getFullYear(), true),
  sex: z.string().optional(),
  activityLevel: z.string().optional(),
  fitnessGoal: z.string().optional(),
  waterGoalMl: optionalNumber(500, 8000, true),
  sleepGoalHours: optionalNumber(3, 14),
  stepGoalSteps: optionalNumber(1000, 50000, true),
});

type FormValues = z.infer<typeof formSchema>;

function profileToFormValues(profile: UserProfile): FormValues {
  return {
    displayName: profile.displayName ?? "",
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    birthYear: profile.birthYear,
    sex: profile.sex ?? "",
    activityLevel: profile.activityLevel ?? "",
    fitnessGoal: profile.fitnessGoal ?? "",
    waterGoalMl: profile.waterGoalMl,
    sleepGoalHours: profile.sleepGoalHours,
    stepGoalSteps: profile.stepGoalSteps,
  };
}

/** 個人資料表單：身高、體重、出生年、性別、活動量、健身目標、每日基本目標（飲水／睡眠／步數）。 */
export function ProfileForm() {
  const { record, isLoading, isError, errorMessage, save, isSaving, refetch } = useSingletonResource(
    userProfileResource,
    () => seedUserProfile()[0]!,
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: record ? profileToFormValues(record) : undefined,
  });

  useEffect(() => {
    if (record) reset(profileToFormValues(record));
  }, [record, reset]);

  if (isError) {
    return <ErrorState description={errorMessage ?? "個人資料載入失敗，請稍後再試一次。"} onRetry={refetch} />;
  }

  if (isLoading || !record) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    save({
      displayName: values.displayName || undefined,
      heightCm: values.heightCm,
      weightKg: values.weightKg,
      birthYear: values.birthYear,
      sex: (values.sex || undefined) as UserProfile["sex"],
      activityLevel: (values.activityLevel || undefined) as UserProfile["activityLevel"],
      fitnessGoal: (values.fitnessGoal || undefined) as UserProfile["fitnessGoal"],
      waterGoalMl: values.waterGoalMl,
      sleepGoalHours: values.sleepGoalHours,
      stepGoalSteps: values.stepGoalSteps,
    });
    toast.success("個人資料已儲存。");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-label uppercase text-ink-muted">基本資料</legend>
        <Input label="顯示名稱" placeholder="您的稱呼" {...register("displayName")} error={errors.displayName?.message} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input
            label="身高（公分）"
            type="number"
            inputMode="decimal"
            step="0.1"
            {...register("heightCm")}
            error={errors.heightCm?.message}
          />
          <Input
            label="體重（公斤）"
            type="number"
            inputMode="decimal"
            step="0.1"
            {...register("weightKg")}
            error={errors.weightKg?.message}
          />
          <Input
            label="出生年份"
            type="number"
            inputMode="numeric"
            {...register("birthYear")}
            error={errors.birthYear?.message}
          />
          <Controller
            control={control}
            name="sex"
            render={({ field }) => (
              <Select
                label="性別"
                placeholder="請選擇"
                options={[...SEX_OPTIONS]}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-label uppercase text-ink-muted">健身狀態</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="activityLevel"
            render={({ field }) => (
              <Select
                label="日常活動量"
                placeholder="請選擇"
                options={[...ACTIVITY_LEVEL_OPTIONS]}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
          <Controller
            control={control}
            name="fitnessGoal"
            render={({ field }) => (
              <Select
                label="健身目標"
                placeholder="請選擇"
                options={[...FITNESS_GOAL_OPTIONS]}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-label uppercase text-ink-muted">每日基本目標</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="飲水目標（毫升）"
            type="number"
            inputMode="numeric"
            {...register("waterGoalMl")}
            error={errors.waterGoalMl?.message}
          />
          <Input
            label="睡眠目標（小時）"
            type="number"
            inputMode="decimal"
            step="0.5"
            {...register("sleepGoalHours")}
            error={errors.sleepGoalHours?.message}
          />
          <Input
            label="步數目標（步）"
            type="number"
            inputMode="numeric"
            {...register("stepGoalSteps")}
            error={errors.stepGoalSteps?.message}
          />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" loading={isSaving} disabled={!isDirty && !isSaving}>
          儲存個人資料
        </Button>
      </div>
    </form>
  );
}
