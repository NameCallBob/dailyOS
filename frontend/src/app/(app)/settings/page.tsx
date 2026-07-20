import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SettingsPage } from "@/features/settings/components/settings-page";
import { MODE_COOKIE, type DaiosMode } from "@/lib/mode";

export const metadata: Metadata = { title: "設定" };

export default async function Page() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MODE_COOKIE)?.value;
  const mode: DaiosMode = raw === "auth" ? "auth" : "trial";

  return <SettingsPage mode={mode} />;
}
