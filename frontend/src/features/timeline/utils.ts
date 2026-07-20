/**
 * features/timeline/utils.ts — 篩選、分組、匯出、活動來源防重複加總等共用邏輯。
 */

import { formatDateHeading, todayKey, withinRange } from "./date-utils";
import type { Activity } from "./schema";
import { TIMELINE_KIND_LABEL, type TimelineEntry, type TimelineFilters } from "./types";

export function filterEntries(entries: TimelineEntry[], filters: TimelineFilters): TimelineEntry[] {
  const needle = filters.search.trim().toLowerCase();
  return entries.filter((entry) => {
    if (!filters.kinds.includes(entry.kind)) return false;
    if (!withinRange(entry.date, filters.dateStart, filters.dateEnd)) return false;
    if (needle) {
      const haystack = `${entry.title} ${entry.subtitle ?? ""} ${entry.notes ?? ""} ${entry.meta.join(" ")}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export interface TimelineGroup {
  date: string;
  heading: string;
  entries: TimelineEntry[];
}

export function groupByDate(entries: TimelineEntry[]): TimelineGroup[] {
  const sorted = [...entries].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const map = new Map<string, TimelineEntry[]>();
  for (const entry of sorted) {
    const list = map.get(entry.date);
    if (list) list.push(entry);
    else map.set(entry.date, [entry]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([date, list]) => ({ date, heading: formatDateHeading(date), entries: list }));
}

// ---------------------------------------------------------------------------
// 活動來源：不同來源不得無聲重複計算
// ---------------------------------------------------------------------------

export interface ActivityDaySources {
  date: string;
  activities: Activity[];
  hasMultipleSources: boolean;
  primary?: Activity;
}

/** 依日期分組活動紀錄，標示同一天是否存在多個來源（提醒使用者，不自動加總）。 */
export function groupActivitiesByDate(activities: Activity[]): ActivityDaySources[] {
  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const list = map.get(a.date);
    if (list) list.push(a);
    else map.set(a.date, [a]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([date, list]) => {
      const sources = new Set(list.map((a) => a.source));
      return {
        date,
        activities: list,
        hasMultipleSources: sources.size > 1,
        primary: list.find((a) => a.isPrimary) ?? list[0],
      };
    });
}

export function formatNumber(value: number | undefined, digits = 0): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("zh-TW", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// ---------------------------------------------------------------------------
// 回診摘要
// ---------------------------------------------------------------------------

export interface AppointmentSummary {
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
  nextAppointmentAt?: string;
  nextAppointmentLabel?: string;
  byDoctor: { doctor: string; count: number }[];
}

export function summarizeAppointments(
  appointments: { startAt: string; status: string; doctor?: string; location: string; department?: string }[],
): AppointmentSummary {
  const now = new Date().toISOString();
  const upcoming = appointments.filter((a) => a.status === "scheduled" && a.startAt >= now);
  const completed = appointments.filter((a) => a.status === "completed");
  const cancelled = appointments.filter((a) => a.status === "cancelled" || a.status === "no_show");
  const sortedUpcoming = [...upcoming].sort((a, b) => (a.startAt < b.startAt ? -1 : 1));
  const next = sortedUpcoming[0];

  const doctorCounts = new Map<string, number>();
  for (const a of appointments) {
    const key = a.doctor?.trim() || "未指定醫師";
    doctorCounts.set(key, (doctorCounts.get(key) ?? 0) + 1);
  }

  return {
    upcomingCount: upcoming.length,
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    nextAppointmentAt: next?.startAt,
    nextAppointmentLabel: next ? [next.department, next.location].filter(Boolean).join(" · ") : undefined,
    byDoctor: [...doctorCounts.entries()]
      .map(([doctor, count]) => ({ doctor, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ---------------------------------------------------------------------------
// 匯出
// ---------------------------------------------------------------------------

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportEntriesToCsv(entries: TimelineEntry[]): string {
  const header = ["日期", "時間", "類型", "標題", "摘要", "備註"];
  const rows = entries.map((e) => [
    e.date,
    e.at.slice(11, 16),
    TIMELINE_KIND_LABEL[e.kind],
    e.title,
    [e.subtitle, ...e.meta].filter(Boolean).join(" / "),
    e.notes ?? "",
  ]);
  return [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
}

export function downloadTextFile(filename: string, content: string, mimeType = "text/csv;charset=utf-8"): void {
  const blob = new Blob([`﻿${content}`], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function defaultExportFilename(): string {
  return `健康時間線_${todayKey()}.csv`;
}
