import type { Metadata } from "next";

import { SymptomsPageClient } from "@/features/symptoms/symptoms-page-client";

export const metadata: Metadata = { title: "症狀" };

export default function SymptomsPage() {
  return <SymptomsPageClient />;
}
