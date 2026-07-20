import type { Metadata } from "next";

import { WorkoutsPage } from "@/features/workouts/components/workouts-page";

export const metadata: Metadata = { title: "健身" };

export default function Page() {
  return <WorkoutsPage />;
}
