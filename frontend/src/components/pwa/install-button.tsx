"use client";

import { Button } from "@/components/ui/button";

import { useInstallPrompt } from "./use-install-prompt";

export function InstallButton() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();

  if (installed) {
    return <span className="text-caption text-ink-muted">已安裝為 App</span>;
  }
  if (!canInstall) return null;

  return (
    <Button variant="secondary" size="sm" onClick={() => void promptInstall()}>
      安裝 DailyOS
    </Button>
  );
}
