import type { Metadata } from "next";

import { MedList } from "@/features/meds/components/med-list";

export const metadata: Metadata = { title: "用藥" };

export default function MedsPage() {
  return <MedList />;
}
