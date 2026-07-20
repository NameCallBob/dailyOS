/**
 * features/calendar/seed.ts — 試用模式種子資料：近 30 天分布的繁體中文日曆事件。
 */
import { addDays, addMinutes } from "./date-utils";
import type { CalendarEvent, CalendarEventType } from "./schema";

function iso(base: Date, dayOffset: number, hour: number, minute = 0): string {
  const d = addDays(base, dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function makeEvent(
  id: string,
  base: Date,
  overrides: {
    title: string;
    dayOffset: number;
    startHour: number;
    startMinute?: number;
    durationMinutes: number;
    type: CalendarEventType;
    allDay?: boolean;
    location?: string;
    description?: string;
    recurrenceRule?: string;
    taskId?: string;
  },
): CalendarEvent {
  const startAt = overrides.allDay
    ? (() => {
        const d = addDays(base, overrides.dayOffset);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      })()
    : iso(base, overrides.dayOffset, overrides.startHour, overrides.startMinute ?? 0);
  const endAt = overrides.allDay
    ? (() => {
        const d = addDays(base, overrides.dayOffset + 1);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      })()
    : addMinutes(new Date(startAt), overrides.durationMinutes).toISOString();

  const now = new Date().toISOString();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    version: 1,
    deleted: false,
    title: overrides.title,
    description: overrides.description,
    startAt,
    endAt,
    allDay: Boolean(overrides.allDay),
    tz: "Asia/Taipei",
    type: overrides.type,
    recurrenceRule: overrides.recurrenceRule,
    taskId: overrides.taskId,
    location: overrides.location,
  };
}

export function generateCalendarEventSeed(): CalendarEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [
    makeEvent("cal-seed-1", today, {
      title: "產品週會",
      dayOffset: -2,
      startHour: 10,
      durationMinutes: 60,
      type: "meeting",
      location: "3F 會議室 A",
      description: "回顧上週進度、確認本週優先順序。",
      recurrenceRule: "FREQ=WEEKLY;INTERVAL=1",
    }),
    makeEvent("cal-seed-2", today, {
      title: "牙醫回診",
      dayOffset: -5,
      startHour: 14,
      startMinute: 30,
      durationMinutes: 45,
      type: "health",
      location: "康是美牙醫診所",
    }),
    makeEvent("cal-seed-3", today, {
      title: "季度旅行：花蓮",
      dayOffset: 12,
      startHour: 0,
      durationMinutes: 0,
      type: "personal",
      allDay: true,
      description: "三天兩夜行程，記得訂火車票。",
    }),
    makeEvent("cal-seed-4", today, {
      title: "與設計師討論介面稿",
      dayOffset: 0,
      startHour: 15,
      durationMinutes: 30,
      type: "meeting",
      location: "線上會議",
    }),
    // 刻意製造衝突：與上一筆時間重疊
    makeEvent("cal-seed-5", today, {
      title: "客戶電話會議",
      dayOffset: 0,
      startHour: 15,
      startMinute: 15,
      durationMinutes: 30,
      type: "meeting",
      location: "線上會議",
    }),
    makeEvent("cal-seed-6", today, {
      title: "提交月報",
      dayOffset: 1,
      startHour: 9,
      durationMinutes: 30,
      type: "task",
      taskId: "task-seed-monthly-report",
    }),
    makeEvent("cal-seed-7", today, {
      title: "瑜伽課",
      dayOffset: 2,
      startHour: 19,
      durationMinutes: 60,
      type: "health",
      location: "社區活動中心",
      recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;COUNT=6",
    }),
    makeEvent("cal-seed-8", today, {
      title: "繳交房租提醒",
      dayOffset: 3,
      startHour: 9,
      durationMinutes: 15,
      type: "reminder",
      recurrenceRule: "FREQ=MONTHLY;INTERVAL=1",
    }),
    makeEvent("cal-seed-9", today, {
      title: "家庭聚餐",
      dayOffset: 5,
      startHour: 18,
      durationMinutes: 120,
      type: "personal",
      location: "阿嬤家",
    }),
    makeEvent("cal-seed-10", today, {
      title: "健檢報告回診",
      dayOffset: -10,
      startHour: 9,
      startMinute: 30,
      durationMinutes: 30,
      type: "health",
      location: "台大醫院",
    }),
    makeEvent("cal-seed-11", today, {
      title: "專案期中檢核",
      dayOffset: 8,
      startHour: 13,
      durationMinutes: 90,
      type: "meeting",
      location: "5F 大會議室",
      description: "邀集全體專案成員，準備簡報。",
    }),
    makeEvent("cal-seed-12", today, {
      title: "每日站立會議",
      dayOffset: -1,
      startHour: 9,
      startMinute: 30,
      durationMinutes: 15,
      type: "meeting",
      recurrenceRule: "FREQ=DAILY;INTERVAL=1;COUNT=20",
    }),
    makeEvent("cal-seed-13", today, {
      title: "生日：小美",
      dayOffset: 20,
      startHour: 0,
      durationMinutes: 0,
      type: "personal",
      allDay: true,
    }),
    makeEvent("cal-seed-14", today, {
      title: "報稅截止日",
      dayOffset: 25,
      startHour: 0,
      durationMinutes: 0,
      type: "reminder",
      allDay: true,
    }),
  ];
}
