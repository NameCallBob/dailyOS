/**
 * features/body/water-store.ts — 飲水偏好設定（每日目標、常用容器）。
 * 屬於本模組私有 UI 偏好，非同步資源，故以 zustand + localStorage 持久化，
 * 不佔用 lib/db.ts 已宣告的共用資料表。
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_WATER_CONTAINERS, DEFAULT_WATER_GOAL_ML, WATER_STORAGE_KEY, type WaterContainer } from "./constants";
import { newId } from "@/lib/resource";

interface WaterPrefsState {
  dailyGoalMl: number;
  containers: WaterContainer[];
  setDailyGoal: (goalMl: number) => void;
  addContainer: (label: string, amountMl: number) => void;
  removeContainer: (id: string) => void;
}

export const useWaterPrefs = create<WaterPrefsState>()(
  persist(
    (set) => ({
      dailyGoalMl: DEFAULT_WATER_GOAL_ML,
      containers: DEFAULT_WATER_CONTAINERS,
      setDailyGoal: (goalMl) => set({ dailyGoalMl: Math.max(0, Math.round(goalMl)) }),
      addContainer: (label, amountMl) =>
        set((state) => ({
          containers: [...state.containers, { id: newId(), label, amountMl: Math.max(1, Math.round(amountMl)) }],
        })),
      removeContainer: (id) => set((state) => ({ containers: state.containers.filter((c) => c.id !== id) })),
    }),
    { name: WATER_STORAGE_KEY },
  ),
);
