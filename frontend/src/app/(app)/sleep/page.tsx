import type { Metadata } from "next";

import { SleepPageContent } from "@/features/sleep/components/sleep-page-content";

export const metadata: Metadata = { title: "睡眠" };

export default function SleepPage() {
  return <SleepPageContent />;
}
