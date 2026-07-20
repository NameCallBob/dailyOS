/**
 * features/calendar/resource.ts — calendar_events 資源（唯一資料存取入口）。
 */
import { createResource } from "@/lib/resource";
import { calendarEventSchema, type CalendarEvent } from "./schema";
import { generateCalendarEventSeed } from "./seed";

export const calendarEventsResource = createResource<CalendarEvent>({
  name: "calendar_events",
  schema: calendarEventSchema,
  seed: generateCalendarEventSeed,
});
