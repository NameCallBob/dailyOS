import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { MODE_COOKIE, type DaiosMode } from "@/lib/mode";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MODE_COOKIE)?.value;
  const mode: DaiosMode = raw === "auth" ? "auth" : "trial";

  return <AppShell mode={mode}>{children}</AppShell>;
}
