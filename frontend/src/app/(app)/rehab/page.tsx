import type { Metadata } from "next";

import { RehabPage } from "@/features/rehab/components/rehab-page";

export const metadata: Metadata = { title: "復健" };

export default function Page() {
  return <RehabPage />;
}
