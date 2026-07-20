"use client";

import { Badge } from "@/components/ui/badge";
import { useOnlineStatus } from "@/components/pwa/use-online-status";

export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <Badge tone="warning" aria-live="polite">
      離線
    </Badge>
  );
}
