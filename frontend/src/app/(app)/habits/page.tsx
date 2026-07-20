import type { Metadata } from "next";

import { HabitList } from "@/features/habits/components/habit-list";

export const metadata: Metadata = { title: "習慣" };

export default function HabitsPage() {
  return <HabitList />;
}
