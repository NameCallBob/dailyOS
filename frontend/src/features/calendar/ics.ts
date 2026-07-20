/**
 * features/calendar/ics.ts — ICS（RFC 5545）匯出／匯入工具，純前端實作。
 */
import { CALENDAR_EVENT_TYPES, type CalendarEvent, type CalendarEventType } from "./schema";

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsUnescape(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function formatIcsDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function formatIcsDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function foldLine(line: string): string {
  // RFC 5545 建議每行 <=75 octets 需摺行；此處以簡化字元長度處理即可。
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

export function eventsToIcs(events: CalendarEvent[]): string {
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DailyOS//Calendar//ZH-TW", "CALSCALE:GREGORIAN"];

  for (const event of events) {
    if (event.deleted) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@dailyos`);
    lines.push(`DTSTAMP:${formatIcsDateTime(event.updatedAt || event.createdAt)}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.startAt)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(event.endAt)}`);
    } else {
      lines.push(`DTSTART:${formatIcsDateTime(event.startAt)}`);
      lines.push(`DTEND:${formatIcsDateTime(event.endAt)}`);
    }
    lines.push(foldLine(`SUMMARY:${icsEscape(event.title)}`));
    if (event.description) lines.push(foldLine(`DESCRIPTION:${icsEscape(event.description)}`));
    if (event.location) lines.push(foldLine(`LOCATION:${icsEscape(event.location)}`));
    if (event.recurrenceRule) lines.push(`RRULE:${event.recurrenceRule}`);
    lines.push(`CATEGORIES:${event.type}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(events: CalendarEvent[], filename = "dailyos-calendar.ics"): void {
  const content = eventsToIcs(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// 匯入
// ---------------------------------------------------------------------------

export interface ImportedEvent {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location?: string;
  recurrenceRule?: string;
  type: CalendarEventType;
  sourceUid?: string;
}

export interface IcsParseResult {
  events: ImportedEvent[];
  errors: string[];
}

function unfoldLines(raw: string): string[] {
  const rawLines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseIcsDateValue(value: string): { iso: string; allDay: boolean } | undefined {
  const clean = value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/;
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/;
  const dm = clean.match(dateOnly);
  if (dm) {
    const [, y, mo, d] = dm;
    return { iso: new Date(Number(y), Number(mo) - 1, Number(d)).toISOString(), allDay: true };
  }
  const tm = clean.match(dateTime);
  if (tm) {
    const [, y, mo, d, h, mi, s, z] = tm;
    const iso = z
      ? new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))).toISOString()
      : new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)).toISOString();
    return { iso, allDay: false };
  }
  return undefined;
}

/** 解析 .ics 檔內容，回傳可匯入的事件陣列與逐筆錯誤訊息（不拋例外、不靜默丟棄） */
export function parseIcs(raw: string): IcsParseResult {
  const lines = unfoldLines(raw);
  const events: ImportedEvent[] = [];
  const errors: string[] = [];

  let current: Record<string, string> | null = null;
  let veventIndex = 0;

  for (const line of lines) {
    if (line.trim() === "BEGIN:VEVENT") {
      current = {};
      veventIndex += 1;
      continue;
    }
    if (line.trim() === "END:VEVENT") {
      if (current) {
        try {
          const summary = current.SUMMARY ? icsUnescape(current.SUMMARY) : "";
          const dtstartRaw = current.DTSTART;
          const dtendRaw = current.DTEND;
          if (!summary) throw new Error("缺少 SUMMARY（標題）");
          if (!dtstartRaw) throw new Error("缺少 DTSTART（開始時間）");
          const dtstart = parseIcsDateValue(dtstartRaw);
          if (!dtstart) throw new Error("DTSTART 格式無法解析");
          const dtend = dtendRaw ? parseIcsDateValue(dtendRaw) : undefined;
          const typeRaw = current.CATEGORIES?.toLowerCase();
          const type: CalendarEventType = (CALENDAR_EVENT_TYPES as readonly string[]).includes(typeRaw ?? "")
            ? (typeRaw as CalendarEventType)
            : "other";
          events.push({
            title: summary,
            description: current.DESCRIPTION ? icsUnescape(current.DESCRIPTION) : undefined,
            startAt: dtstart.iso,
            endAt: dtend?.iso ?? dtstart.iso,
            allDay: dtstart.allDay,
            location: current.LOCATION ? icsUnescape(current.LOCATION) : undefined,
            recurrenceRule: current.RRULE,
            type,
            sourceUid: current.UID,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "無法解析此事件";
          errors.push(`第 ${veventIndex} 筆事件：${message}`);
        }
      }
      current = null;
      continue;
    }
    if (current) {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) continue;
      let key = line.slice(0, separatorIndex);
      const value = line.slice(separatorIndex + 1);
      // 去除參數，如 DTSTART;VALUE=DATE
      if (key.includes(";")) key = key.split(";")[0] ?? key;
      current[key] = value;
    }
  }

  return { events, errors };
}
