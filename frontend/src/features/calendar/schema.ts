/**
 * features/calendar/schema.ts — 日曆事件（calendar_events）的 zod schema 與型別。
 *
 * 欄位命名對齊 lib/db.ts 已宣告的 Dexie 索引："id, startAt, endAt, updatedAt, deleted"。
 */
import { z } from "zod";

export const CALENDAR_EVENT_TYPES = [
  "meeting",
  "task",
  "personal",
  "health",
  "reminder",
  "other",
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  meeting: "會議",
  task: "任務",
  personal: "個人",
  health: "健康",
  reminder: "提醒",
  other: "其他",
};

/** 目前支援的重複頻率（RRULE 子集：FREQ + INTERVAL + COUNT/UNTIL + BYDAY） */
export const RECURRENCE_FREQS = ["NONE", "DAILY", "WEEKLY", "MONTHLY"] as const;
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];

export const calendarEventSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  deleted: z.boolean(),

  title: z.string().min(1, "請輸入標題").max(200),
  description: z.string().max(2000).optional(),
  startAt: z.string().min(1, "請選擇開始時間"),
  endAt: z.string().min(1, "請選擇結束時間"),
  allDay: z.boolean(),
  tz: z.string().min(1),
  type: z.enum(CALENDAR_EVENT_TYPES),
  recurrenceRule: z.string().optional(),
  taskId: z.string().optional(),
  location: z.string().max(200).optional(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

/** 建立/編輯表單使用的輸入子集（不含 BaseRecord 系統欄位） */
export const calendarEventFormSchema = z
  .object({
    title: z.string().min(1, "請輸入標題").max(200),
    description: z.string().max(2000).optional().or(z.literal("")),
    date: z.string().min(1, "請選擇日期"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    endDate: z.string().optional(),
    allDay: z.boolean(),
    tz: z.string().min(1, "請選擇時區"),
    type: z.enum(CALENDAR_EVENT_TYPES),
    location: z.string().max(200).optional().or(z.literal("")),
    recurrenceFreq: z.enum(RECURRENCE_FREQS),
    recurrenceInterval: z.coerce.number().int().min(1).max(365).default(1),
    recurrenceCount: z.coerce.number().int().min(1).max(365).optional(),
    recurrenceUntil: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.allDay) {
      if (!val.startTime) {
        ctx.addIssue({ code: "custom", path: ["startTime"], message: "請輸入開始時間" });
      }
      if (!val.endTime) {
        ctx.addIssue({ code: "custom", path: ["endTime"], message: "請輸入結束時間" });
      }
    }
  });

export type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>;

export const IANA_TIMEZONES = [
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
];
