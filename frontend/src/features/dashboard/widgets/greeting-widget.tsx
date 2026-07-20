"use client";

import { formatFullDate, greetingForHour } from "../date-utils";

export function GreetingWidget() {
  const now = new Date();

  return (
    <div className="flex flex-col gap-1 py-2">
      <p className="text-caption uppercase tracking-wide text-ink-muted">{formatFullDate(now)}</p>
      <h1 className="text-h1 text-ink">{greetingForHour(now.getHours())}</h1>
      <p className="text-body text-ink-muted">這是今天的總覽，重點都在下面幾張卡片裡。</p>
    </div>
  );
}
