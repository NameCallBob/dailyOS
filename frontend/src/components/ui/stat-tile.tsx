import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  className?: string;
}

const deltaToneClasses: Record<NonNullable<StatTileProps["deltaTone"]>, string> = {
  up: "text-success",
  down: "text-danger",
  flat: "text-ink-muted",
};

export function StatTile({ label, value, unit, delta, deltaTone = "flat", className }: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border border-line bg-paper-raised p-4", className)}>
      <span className="text-label uppercase text-ink-muted">{label}</span>
      <span className="text-numeric tabular-nums text-ink">
        {value}
        {unit ? <span className="ml-1 text-caption font-normal text-ink-muted">{unit}</span> : null}
      </span>
      {delta ? (
        <span className={cn("text-caption tabular-nums", deltaToneClasses[deltaTone])}>{delta}</span>
      ) : null}
    </div>
  );
}
