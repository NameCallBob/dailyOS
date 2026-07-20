import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { DaiosMode } from "@/lib/mode";

const MODE_LABEL: Record<DaiosMode, string> = {
  trial: "試用模式",
  local: "本機模式",
  auth: "雲端模式",
};

const MODE_TONE: Record<DaiosMode, BadgeTone> = {
  trial: "neutral",
  local: "success",
  auth: "accent",
};

export function ModeBadge({ mode }: { mode: DaiosMode }) {
  return <Badge tone={MODE_TONE[mode]}>{MODE_LABEL[mode]}</Badge>;
}
