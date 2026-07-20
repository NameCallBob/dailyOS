import type { Metadata } from "next";

import { BodyPage } from "@/features/body/components/body-page";

export const metadata: Metadata = { title: "身體數據" };

export default function Page() {
  return <BodyPage />;
}
