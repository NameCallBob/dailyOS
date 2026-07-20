/**
 * features/calendar/store.ts — 本地 UI 狀態（檢視模式 / 目前聚焦日期），不涉及資料存取。
 */
import { create } from "zustand";

import { toDateKey } from "./date-utils";

export type CalendarViewMode = "day" | "week" | "month" | "agenda";

interface CalendarStore {
  view: CalendarViewMode;
  focusedDateKey: string;
  setView: (view: CalendarViewMode) => void;
  setFocusedDateKey: (key: string) => void;
  goToday: () => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  view: "week",
  focusedDateKey: toDateKey(new Date()),
  setView: (view) => set({ view }),
  setFocusedDateKey: (key) => set({ focusedDateKey: key }),
  goToday: () => set({ focusedDateKey: toDateKey(new Date()) }),
}));
