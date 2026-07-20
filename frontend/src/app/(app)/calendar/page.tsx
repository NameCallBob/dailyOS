import type { Metadata } from "next";

import { CalendarView } from "@/features/calendar/calendar-view";

export const metadata: Metadata = { title: "日曆" };

export default function CalendarPage() {
  return <CalendarView />;
}
