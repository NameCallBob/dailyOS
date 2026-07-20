/**
 * features/dashboard/layout.ts — 總覽小工具的註冊表與版面狀態管理。
 * 顯示/隱藏/排序狀態存於 `dashboard_layout` 資料表（本模組擁有）。
 */

import { useMemo } from "react";

import type { DashboardWidgetConfig, WidgetKey } from "./types";

export interface WidgetMeta {
  key: WidgetKey;
  title: string;
  description: string;
  /** 版面設定中是否允許使用者隱藏；greeting/quickAdd 屬於入口性質，仍可隱藏但預設開啟。 */
}

export const WIDGET_META: Record<WidgetKey, WidgetMeta> = {
  greeting: { key: "greeting", title: "今日問候", description: "日期與問候語" },
  quickAdd: { key: "quickAdd", title: "快速新增入口", description: "一鍵開啟快速新增" },
  topTasks: { key: "topTasks", title: "今日最重要三件事", description: "依優先度挑出的重點任務" },
  todaySchedule: { key: "todaySchedule", title: "今日行程", description: "今天的行事曆事件" },
  overdueTasks: { key: "overdueTasks", title: "逾期任務", description: "已過期但尚未完成的任務" },
  activeTimer: { key: "activeTimer", title: "進行中計時器", description: "目前正在計時的項目" },
  completionRate: { key: "completionRate", title: "今日完成率", description: "今天到期任務的完成比例" },
  water: { key: "water", title: "今日飲水", description: "今天累計飲水量" },
  activity: { key: "activity", title: "今日活動量", description: "今天的運動時間與消耗" },
  healthStatus: { key: "healthStatus", title: "今日健康紀錄狀態", description: "各類健康紀錄是否已填寫" },
  habits: { key: "habits", title: "今日習慣", description: "今天的習慣打卡狀態" },
  suggestions: { key: "suggestions", title: "系統建議", description: "根據目前資料產生的建議事項" },
  recentNotes: { key: "recentNotes", title: "最近筆記", description: "最近更新的筆記" },
};

/** 版面預設順序；同時作為 seed 資料的排序基準。 */
export const DEFAULT_WIDGET_ORDER: WidgetKey[] = [
  "greeting",
  "suggestions",
  "topTasks",
  "todaySchedule",
  "overdueTasks",
  "activeTimer",
  "completionRate",
  "habits",
  "water",
  "activity",
  "healthStatus",
  "recentNotes",
  "quickAdd",
];

/** 由 dashboard_layout 紀錄推導出「依序、僅可見」的 widget key 陣列；容錯處理缺漏/新增的 key。 */
export function useResolvedWidgetOrder(widgets: DashboardWidgetConfig[] | undefined): DashboardWidgetConfig[] {
  return useMemo(() => {
    const known = new Set(DEFAULT_WIDGET_ORDER);
    const existingKeys = new Set((widgets ?? []).map((w) => w.key));
    const merged: DashboardWidgetConfig[] = [...(widgets ?? [])].filter((w) => known.has(w.key as WidgetKey));
    // 補上版面設定中尚未出現的新 widget（例如契約更新後新增的小工具）
    DEFAULT_WIDGET_ORDER.forEach((key, index) => {
      if (!existingKeys.has(key)) {
        merged.push({ key, visible: true, order: merged.length + index });
      }
    });
    return merged.slice().sort((a, b) => a.order - b.order);
  }, [widgets]);
}
