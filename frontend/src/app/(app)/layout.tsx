"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { RouteGuard } from "@/components/auth/route-guard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <RouteGuard>{(mode) => <AppShell mode={mode}>{children}</AppShell>}</RouteGuard>;
}
