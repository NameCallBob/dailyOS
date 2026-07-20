import type { Metadata } from "next";

import { TimelinePage } from "@/features/timeline/components/timeline-page";

export const metadata: Metadata = { title: "健康時間線" };

export default function Page() {
  return <TimelinePage />;
}
