import type { Metadata } from "next";

import { SettingsPageClient } from "@/features/settings/components/settings-page-client";

export const metadata: Metadata = { title: "設定" };

export default function Page() {
  return <SettingsPageClient />;
}
