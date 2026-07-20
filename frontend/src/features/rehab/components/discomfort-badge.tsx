import { Badge, type BadgeTone } from "@/components/ui/badge";

import { DISCOMFORT_LABELS } from "../constants";

function toneFor(value: number): BadgeTone {
  if (value >= 7) return "danger";
  if (value >= 4) return "warning";
  if (value >= 1) return "accent";
  return "success";
}

export function DiscomfortBadge({ value, prefix }: { value: number | undefined; prefix?: string }) {
  if (value === undefined) {
    return <Badge tone="neutral">{prefix ? `${prefix}未填寫` : "未填寫"}</Badge>;
  }
  const label = DISCOMFORT_LABELS[value] ?? String(value);
  return (
    <Badge tone={toneFor(value)}>
      {prefix ? `${prefix}${value}` : value}／10・{label}
    </Badge>
  );
}
