/**
 * features/notes/utils.ts — 共用工具函式（日期、標籤解析、每日筆記標題）。
 */

export function todayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateStrDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoDaysAgo(daysAgo: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function dailyNoteTitleFor(dateStr: string): string {
  return `每日筆記 ${dateStr}`;
}

/** 逗號 / 頓號 / 空白分隔的標籤輸入字串 -> 去重、去空白的標籤陣列 */
export function parseTagsInput(input: string): string[] {
  const raw = input
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 30);
}

export function tagsToInput(tags: string[]): string {
  return tags.join(", ");
}

/** 取內容前 N 字作為列表摘要，去除 Markdown 語法符號 */
export function excerpt(content: string, length = 80): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[\[([^\]]+)]]/g, "$1")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= length) return plain;
  return `${plain.slice(0, length)}…`;
}

/** folder 路徑轉為麵包屑陣列，例如 "工作/專案A" -> ["工作", "專案A"] */
export function folderSegments(folder: string): string[] {
  return folder
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}
