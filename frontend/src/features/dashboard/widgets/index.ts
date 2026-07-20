import type { ComponentType } from "react";

import type { WidgetKey } from "../types";
import { ActiveTimerWidget } from "./active-timer-widget";
import { ActivityWidget } from "./activity-widget";
import { CompletionRateWidget } from "./completion-rate-widget";
import { GreetingWidget } from "./greeting-widget";
import { HabitsWidget } from "./habits-widget";
import { HealthStatusWidget } from "./health-status-widget";
import { OverdueTasksWidget } from "./overdue-tasks-widget";
import { QuickAddWidget } from "./quick-add-widget";
import { RecentNotesWidget } from "./recent-notes-widget";
import { SuggestionsWidget } from "./suggestions-widget";
import { TodayScheduleWidget } from "./today-schedule-widget";
import { TopTasksWidget } from "./top-tasks-widget";
import { WaterWidget } from "./water-widget";

export const WIDGET_COMPONENTS: Record<WidgetKey, ComponentType> = {
  greeting: GreetingWidget,
  quickAdd: QuickAddWidget,
  topTasks: TopTasksWidget,
  todaySchedule: TodayScheduleWidget,
  overdueTasks: OverdueTasksWidget,
  activeTimer: ActiveTimerWidget,
  completionRate: CompletionRateWidget,
  water: WaterWidget,
  activity: ActivityWidget,
  healthStatus: HealthStatusWidget,
  habits: HabitsWidget,
  suggestions: SuggestionsWidget,
  recentNotes: RecentNotesWidget,
};

/** 版面格線：部分小工具（問候／系統建議）需要橫跨全寬，其餘採單欄。 */
export const WIDGET_SPAN: Partial<Record<WidgetKey, string>> = {
  greeting: "md:col-span-2 xl:col-span-3",
  suggestions: "md:col-span-2 xl:col-span-3",
};
