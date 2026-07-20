/**
 * features/calendar/recurrence.ts — 極簡 RRULE 子集（FREQ/INTERVAL/COUNT/UNTIL）解析、
 * 產生字串，以及在指定日期範圍內展開事件的發生（occurrence）。
 *
 * 僅支援 DAILY / WEEKLY / MONTHLY，足以涵蓋一般個人日曆需求；
 * 不支援的規則字串會被視為「不重複」以避免誤展開造成資料錯誤。
 */
import type { CalendarEvent } from "./schema";
import type { RecurrenceFreq } from "./schema";
import { addDays, addMinutes, addMonths, diffMinutes } from "./date-utils";

export interface ParsedRecurrence {
  freq: RecurrenceFreq;
  interval: number;
  count?: number;
  until?: string; // ISO
}

export function buildRecurrenceRule(input: ParsedRecurrence): string | undefined {
  if (input.freq === "NONE") return undefined;
  const parts = [`FREQ=${input.freq}`, `INTERVAL=${Math.max(1, input.interval || 1)}`];
  if (input.count) parts.push(`COUNT=${input.count}`);
  else if (input.until) parts.push(`UNTIL=${input.until}`);
  return parts.join(";");
}

export function parseRecurrenceRule(rule: string | undefined): ParsedRecurrence {
  if (!rule) return { freq: "NONE", interval: 1 };
  const fields = Object.fromEntries(
    rule.split(";").map((pair) => {
      const [k, v] = pair.split("=");
      return [k, v] as [string, string];
    }),
  );
  const freq = fields.FREQ;
  if (freq !== "DAILY" && freq !== "WEEKLY" && freq !== "MONTHLY") {
    return { freq: "NONE", interval: 1 };
  }
  return {
    freq,
    interval: fields.INTERVAL ? Math.max(1, parseInt(fields.INTERVAL, 10) || 1) : 1,
    count: fields.COUNT ? parseInt(fields.COUNT, 10) : undefined,
    until: fields.UNTIL,
  };
}

export interface Occurrence {
  /** 事件本身 id + 該次發生的開始時間 ISO，作為前端唯一鍵 */
  occurrenceId: string;
  event: CalendarEvent;
  start: Date;
  end: Date;
  isRecurring: boolean;
  /** 是否為系列的第一次發生（即與 event.startAt 相同） */
  isFirst: boolean;
}

const MAX_OCCURRENCES = 366;

/**
 * 展開單一事件在 [rangeStart, rangeEnd) 內的所有發生。
 * 非重複事件：若與範圍重疊則回傳單一 occurrence。
 */
export function expandEvent(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const baseStart = new Date(event.startAt);
  const baseEnd = new Date(event.endAt);
  const durationMinutes = Math.max(0, diffMinutes(baseStart, baseEnd));

  const rule = parseRecurrenceRule(event.recurrenceRule);
  if (rule.freq === "NONE") {
    if (baseEnd < rangeStart || baseStart >= rangeEnd) return [];
    return [
      {
        occurrenceId: `${event.id}::${event.startAt}`,
        event,
        start: baseStart,
        end: baseEnd,
        isRecurring: false,
        isFirst: true,
      },
    ];
  }

  const until = rule.until ? new Date(rule.until) : undefined;
  const results: Occurrence[] = [];
  let cursor = baseStart;
  let index = 0;

  while (index < MAX_OCCURRENCES) {
    if (rule.count !== undefined && index >= rule.count) break;
    if (until && cursor > until) break;
    if (cursor >= rangeEnd) break;

    const occEnd = addMinutes(cursor, durationMinutes);
    if (occEnd > rangeStart) {
      results.push({
        occurrenceId: `${event.id}::${cursor.toISOString()}`,
        event,
        start: cursor,
        end: occEnd,
        isRecurring: true,
        isFirst: index === 0,
      });
    }

    index += 1;
    cursor =
      rule.freq === "DAILY"
        ? addDays(cursor, rule.interval)
        : rule.freq === "WEEKLY"
          ? addDays(cursor, 7 * rule.interval)
          : addMonths(cursor, rule.interval);
  }

  return results;
}

export function expandEvents(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const all: Occurrence[] = [];
  for (const event of events) {
    if (event.deleted) continue;
    all.push(...expandEvent(event, rangeStart, rangeEnd));
  }
  all.sort((a, b) => a.start.getTime() - b.start.getTime());
  return all;
}

export const RECURRENCE_FREQ_LABELS: Record<RecurrenceFreq, string> = {
  NONE: "不重複",
  DAILY: "每天",
  WEEKLY: "每週",
  MONTHLY: "每月",
};

export function describeRecurrence(rule: string | undefined): string {
  const parsed = parseRecurrenceRule(rule);
  if (parsed.freq === "NONE") return "不重複";
  const base = parsed.interval > 1 ? `每 ${parsed.interval} ${parsed.freq === "DAILY" ? "天" : parsed.freq === "WEEKLY" ? "週" : "月"}` : RECURRENCE_FREQ_LABELS[parsed.freq];
  if (parsed.count) return `${base}，共 ${parsed.count} 次`;
  if (parsed.until) return `${base}，直到 ${parsed.until.slice(0, 10)}`;
  return base;
}
