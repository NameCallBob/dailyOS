import { Badge } from "@/components/ui/badge";
import type { DaiosMode } from "@/lib/mode";

export function ModeBadge({ mode }: { mode: DaiosMode }) {
  if (mode === "auth") {
    return <Badge tone="accent">登入模式</Badge>;
  }
  return <Badge tone="neutral">試用模式</Badge>;
}
