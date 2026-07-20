/**
 * features/reminders/dedupe.ts — 已發送/延後(snooze) 紀錄，存於 localStorage。
 *
 * 刻意不使用 Dexie（不新增資料表）：這些紀錄純屬本裝置的提醒排程狀態（不需同步、
 * 不需跨裝置），localStorage 足夠且不牽動 lib/db.ts 的共用 schema。
 */

const SENT_KEY = "daios_reminders_sent_v1";
const SNOOZE_KEY = "daios_reminders_snooze_v1";
const MAX_SENT_AGE_MS = 1000 * 60 * 60 * 24 * 3; // 3 天後視為過期，避免 localStorage 無限增長

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readMap(key: string): Record<string, string> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, string>): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // localStorage 滿了或被封鎖時靜默忽略——提醒仍可運作，只是去重會失效。
  }
}

/** 清除超過 MAX_SENT_AGE_MS 的已發送紀錄，避免無限增長。 */
export function pruneSentLog(now: Date = new Date()): void {
  const map = readMap(SENT_KEY);
  const cutoff = now.getTime() - MAX_SENT_AGE_MS;
  let changed = false;
  for (const [key, sentAt] of Object.entries(map)) {
    if (new Date(sentAt).getTime() < cutoff) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) writeMap(SENT_KEY, map);
}

export function hasBeenSent(dedupeKey: string): boolean {
  const map = readMap(SENT_KEY);
  return dedupeKey in map;
}

export function markSent(dedupeKey: string, at: Date = new Date()): void {
  const map = readMap(SENT_KEY);
  map[dedupeKey] = at.toISOString();
  writeMap(SENT_KEY, map);
}

export function getSnoozeUntil(dedupeKey: string): string | undefined {
  const map = readMap(SNOOZE_KEY);
  return map[dedupeKey];
}

export function setSnooze(dedupeKey: string, minutes: number, from: Date = new Date()): string {
  const until = new Date(from.getTime() + minutes * 60_000).toISOString();
  const map = readMap(SNOOZE_KEY);
  map[dedupeKey] = until;
  writeMap(SNOOZE_KEY, map);
  return until;
}

export function clearSnooze(dedupeKey: string): void {
  const map = readMap(SNOOZE_KEY);
  if (dedupeKey in map) {
    delete map[dedupeKey];
    writeMap(SNOOZE_KEY, map);
  }
}
