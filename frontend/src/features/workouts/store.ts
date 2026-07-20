/**
 * features/workouts/store.ts — 健身模組本地 UI 狀態（zustand）。
 * 資料存取一律走 resources.ts；此處只放檢視狀態、篩選條件、最近動作快取。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { WorkoutType } from "./types";

export type WorkoutTab = "overview" | "log" | "library";

interface WorkoutsState {
  tab: WorkoutTab;
  typeFilter: WorkoutType | "all";
  /** 最近使用的動作 id（最新在前，最多保留 10 筆），供「最近動作」快速選取。 */
  recentExerciseIds: string[];
  setTab: (tab: WorkoutTab) => void;
  setTypeFilter: (type: WorkoutType | "all") => void;
  touchRecentExercise: (exerciseDefId: string) => void;
}

export const useWorkoutsStore = create<WorkoutsState>()(
  persist(
    (set) => ({
      tab: "log",
      typeFilter: "all",
      recentExerciseIds: [],
      setTab: (tab) => set({ tab }),
      setTypeFilter: (type) => set({ typeFilter: type }),
      touchRecentExercise: (exerciseDefId) =>
        set((s) => ({
          recentExerciseIds: [exerciseDefId, ...s.recentExerciseIds.filter((id) => id !== exerciseDefId)].slice(0, 10),
        })),
    }),
    {
      name: "daios-workouts-ui",
      partialize: (s) => ({ recentExerciseIds: s.recentExerciseIds }),
    },
  ),
);
