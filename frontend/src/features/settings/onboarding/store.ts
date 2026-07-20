/**
 * features/settings/onboarding/store.ts — Onboarding 流程的本地 UI 狀態（zustand）。
 * 實際資料（purposes / enabledModules / notification prefs / 每日目標）一律經由
 * useSingletonResource() 存取對應資源；此 store 只保存「目前在第幾步」與草稿選取狀態。
 */

"use client";

import { create } from "zustand";

export const ONBOARDING_STEP_COUNT = 4;

interface OnboardingUiState {
  step: number;
  setStep: (step: number) => void;
  next: () => void;
  back: () => void;
  /** 由已儲存的 user_preferences.onboardingStep 初始化，只在掛載時執行一次。 */
  hydrateFromSaved: (savedStep: number) => void;
  hydrated: boolean;
}

export const useOnboardingStore = create<OnboardingUiState>((set, get) => ({
  step: 0,
  hydrated: false,
  setStep: (step) => set({ step: Math.max(0, Math.min(ONBOARDING_STEP_COUNT - 1, step)) }),
  next: () => set({ step: Math.min(ONBOARDING_STEP_COUNT - 1, get().step + 1) }),
  back: () => set({ step: Math.max(0, get().step - 1) }),
  hydrateFromSaved: (savedStep) => {
    if (get().hydrated) return;
    set({ step: Math.max(0, Math.min(ONBOARDING_STEP_COUNT - 1, savedStep)), hydrated: true });
  },
}));
