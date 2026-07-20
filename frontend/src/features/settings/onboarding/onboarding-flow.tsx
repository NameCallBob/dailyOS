"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { getMode, setMode } from "@/lib/mode";
import { DEFAULT_NOTIFICATION_CHANNELS, PURPOSE_MODULE_SUGGESTIONS, detectTimezone, type PurposeValue } from "../constants";
import { useSingletonResource } from "../hooks";
import { notificationPrefsResource, userPreferencesResource, userProfileResource } from "../resources";
import type { NotificationChannels } from "../schema";
import { seedNotificationPrefs, seedUserPreferences, seedUserProfile } from "../seed";
import { OnboardingProgress } from "./progress";
import { ONBOARDING_STEP_COUNT, useOnboardingStore } from "./store";
import { StepGoals } from "./step-goals";
import { StepModules } from "./step-modules";
import { StepNotifications } from "./step-notifications";
import { StepPurpose } from "./step-purpose";

const STEP_LABELS = ["使用目的", "啟用模組", "通知偏好", "每日基本目標"];

interface Draft {
  purposes: PurposeValue[];
  enabledModules: string[];
  channels: NotificationChannels;
  timezone: string;
  waterGoalMl: number;
  sleepGoalHours: number;
  stepGoalSteps: number;
}

function buildDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    purposes: [],
    enabledModules: [],
    channels: { ...DEFAULT_NOTIFICATION_CHANNELS },
    timezone: detectTimezone(),
    waterGoalMl: 2000,
    sleepGoalHours: 8,
    stepGoalSteps: 8000,
    ...overrides,
  };
}

/** Onboarding 四步驟主流程：可跳過、漸進式儲存（每步「下一步」即寫入對應資源）。 */
export function OnboardingFlow() {
  const router = useRouter();
  const step = useOnboardingStore((s) => s.step);
  const goNext = useOnboardingStore((s) => s.next);
  const goBack = useOnboardingStore((s) => s.back);
  const hydrateFromSaved = useOnboardingStore((s) => s.hydrateFromSaved);

  const preferences = useSingletonResource(userPreferencesResource, () => seedUserPreferences()[0]!);
  const notificationPrefs = useSingletonResource(notificationPrefsResource, () => seedNotificationPrefs()[0]!);
  const profile = useSingletonResource(userProfileResource, () => seedUserProfile()[0]!);

  const [draft, setDraftState] = useState<Draft>(buildDraft());
  const [finishing, setFinishing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!getMode()) setMode("trial");
  }, []);

  // 三個資源都載入完成後，把已儲存的值灌入本地可編輯草稿；只執行一次。
  // 依 React 官方建議的「render 期間調整 state」模式：不使用 effect，
  // 避免非同步資源就緒時機與 effect 觸發時機不一致造成的 lint / 競態問題。
  if (preferences.record && notificationPrefs.record && profile.record && !hydrated) {
    setHydrated(true);
    setDraftState(
      buildDraft({
        purposes: preferences.record.purposes as PurposeValue[],
        enabledModules: preferences.record.enabledModules,
        channels: notificationPrefs.record.channels,
        timezone: notificationPrefs.record.timezone,
        waterGoalMl: profile.record.waterGoalMl ?? 2000,
        sleepGoalHours: profile.record.sleepGoalHours ?? 8,
        stepGoalSteps: profile.record.stepGoalSteps ?? 8000,
      }),
    );
    hydrateFromSaved(preferences.record.onboardingCompleted ? 0 : preferences.record.onboardingStep);
  }

  function updateDraft(patch: Partial<Draft>) {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }

  function suggestModulesFromPurposes(purposes: PurposeValue[]): string[] {
    const suggested = new Set<string>();
    for (const purpose of purposes) {
      for (const key of PURPOSE_MODULE_SUGGESTIONS[purpose]) suggested.add(key);
    }
    return Array.from(suggested);
  }

  async function persistStep(targetStep: number) {
    if (step === 0) {
      preferences.save({ purposes: draft.purposes, onboardingStep: targetStep });
      // 若使用者尚未在第二步手動調整，先依使用目的預先勾選建議模組。
      if (draft.enabledModules.length === 0) {
        const suggestion = suggestModulesFromPurposes(draft.purposes);
        updateDraft({ enabledModules: suggestion });
      }
    } else if (step === 1) {
      preferences.save({ enabledModules: draft.enabledModules, onboardingStep: targetStep });
    } else if (step === 2) {
      notificationPrefs.save({ channels: draft.channels, timezone: draft.timezone });
      preferences.save({ onboardingStep: targetStep });
    }
    // step === 3（最後一步）由 handleFinish() 統一儲存，避免重複寫入。
  }

  async function handleNext() {
    await persistStep(step + 1);
    if (step >= ONBOARDING_STEP_COUNT - 1) {
      await handleFinish();
      return;
    }
    goNext();
  }

  async function handleFinish() {
    setFinishing(true);
    preferences.save({
      purposes: draft.purposes,
      enabledModules: draft.enabledModules,
      onboardingCompleted: true,
      onboardingStep: ONBOARDING_STEP_COUNT,
      onboardingSkipped: false,
    });
    notificationPrefs.save({ channels: draft.channels, timezone: draft.timezone });
    profile.save({
      waterGoalMl: draft.waterGoalMl,
      sleepGoalHours: draft.sleepGoalHours,
      stepGoalSteps: draft.stepGoalSteps,
    });
    toast.success("設定完成，歡迎使用 DailyOS。");
    router.push("/dashboard");
  }

  function handleSkipAll() {
    preferences.save({ onboardingCompleted: true, onboardingSkipped: true });
    toast.info("已略過導覽，您隨時可以在「設定」中調整。");
    router.push("/dashboard");
  }

  const anyError = preferences.isError || notificationPrefs.isError || profile.isError;
  const anyLoading = preferences.isLoading || notificationPrefs.isLoading || profile.isLoading || !hydrated;

  if (anyError) {
    return (
      <ErrorState
        description="初始化設定失敗，請重新整理頁面再試一次。"
        onRetry={() => {
          preferences.refetch();
          notificationPrefs.refetch();
          profile.refetch();
        }}
      />
    );
  }

  if (anyLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const isLastStep = step === ONBOARDING_STEP_COUNT - 1;
  const isSaving = preferences.isSaving || notificationPrefs.isSaving || profile.isSaving || finishing;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-label uppercase text-ink-muted">歡迎使用</p>
          <h1 className="text-h1 text-ink">DailyOS 初次設定</h1>
          <p className="text-caption text-ink-muted">
            花一分鐘快速設定，之後隨時可在「設定」頁調整。所有步驟皆可略過。
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkipAll} disabled={isSaving}>
          跳過導覽
        </Button>
      </div>

      <OnboardingProgress step={step} total={ONBOARDING_STEP_COUNT} labels={STEP_LABELS} />

      <div className="min-h-[16rem]">
        {step === 0 ? (
          <StepPurpose value={draft.purposes} onChange={(purposes) => updateDraft({ purposes })} />
        ) : null}
        {step === 1 ? (
          <StepModules value={draft.enabledModules} onChange={(enabledModules) => updateDraft({ enabledModules })} />
        ) : null}
        {step === 2 ? (
          <StepNotifications
            channels={draft.channels}
            onChangeChannels={(channels) => updateDraft({ channels })}
            timezone={draft.timezone}
            onChangeTimezone={(timezone) => updateDraft({ timezone })}
          />
        ) : null}
        {step === 3 ? (
          <StepGoals
            waterGoalMl={draft.waterGoalMl}
            sleepGoalHours={draft.sleepGoalHours}
            stepGoalSteps={draft.stepGoalSteps}
            onChange={(patch) => updateDraft(patch)}
          />
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-line pt-6">
        <Button type="button" variant="secondary" onClick={goBack} disabled={step === 0 || isSaving}>
          上一步
        </Button>
        <Button type="button" onClick={handleNext} loading={isSaving}>
          {isLastStep ? "完成設定" : "下一步"}
        </Button>
      </div>
    </div>
  );
}
