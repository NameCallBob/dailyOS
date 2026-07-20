import type { Metadata } from "next";

import { FocusPageContent } from "@/features/focus/focus-page-content";

export const metadata: Metadata = { title: "專注" };

export default function FocusPage() {
  return <FocusPageContent />;
}
